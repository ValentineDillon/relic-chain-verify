// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Relic Chain Verify
/// @notice A contract for listing and trading collectibles with FHE-encrypted metadata
/// @dev Metadata is encrypted on-chain and only decryptable by the current owner
contract RelicChainVerify is SepoliaConfig {
    struct Collectible {
        uint256 tokenId;
        address owner;
        string name;
        string imageUri;
        euint32 encryptedPurchasePrice;    // Encrypted purchase price
        euint32 encryptedCertificateNumber; // Encrypted certificate number
        euint32 encryptedSerialNumber;      // Encrypted serial number
        euint32 encryptedOriginCode;        // Encrypted origin code (encoded)
        uint256 listedAt;
        bool exists;
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
        bytes32 txHash;
    }

    struct PurchaseRequest {
        uint256 requestId;
        uint256 tokenId;
        address buyer;
        uint256 offerAmount;
        bool isPending;
        bool isApproved;
        uint256 timestamp;
    }

    mapping(uint256 => Collectible) public collectibles;
    mapping(uint256 => TransferRecord[]) public provenance;
    mapping(address => uint256[]) public ownerCollectibles;
    mapping(uint256 => PurchaseRequest) public purchaseRequests; // requestId => PurchaseRequest
    mapping(uint256 => uint256[]) public tokenPurchaseRequests; // tokenId => requestId[]
    mapping(address => uint256[]) public buyerRequests; // buyer => requestId[]
    mapping(address => uint256[]) public ownerPendingRequests; // owner => requestId[]
    
    uint256 public nextTokenId;
    uint256 public nextRequestId;
    
    event CollectibleListed(
        uint256 indexed tokenId,
        address indexed owner,
        string name,
        uint256 timestamp
    );
    
    event PurchaseRequested(
        uint256 indexed requestId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 offerAmount,
        address owner
    );
    
    event PurchaseApproved(
        uint256 indexed requestId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );
    
    event PurchaseRejected(
        uint256 indexed requestId,
        uint256 indexed tokenId,
        address indexed buyer
    );
    
    event CollectiblePurchased(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 price,
        uint256 timestamp
    );

    /// @notice List a new collectible with encrypted metadata
    /// @param name The public name of the collectible
    /// @param imageUri The URI of the collectible image
    /// @param encryptedPrice Encrypted purchase price
    /// @param encryptedCert Encrypted certificate number
    /// @param encryptedSerial Encrypted serial number
    /// @param encryptedOrigin Encrypted origin code
    /// @param inputProof The input proof for all encrypted values
    /// @return tokenId The ID of the newly listed collectible
    function listCollectible(
        string memory name,
        string memory imageUri,
        externalEuint32 encryptedPrice,
        externalEuint32 encryptedCert,
        externalEuint32 encryptedSerial,
        externalEuint32 encryptedOrigin,
        bytes calldata inputProof
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(imageUri).length > 0, "Image URI required");
        
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        
        // Convert external ciphertexts to internal encrypted types
        euint32 price = FHE.fromExternal(encryptedPrice, inputProof);
        euint32 cert = FHE.fromExternal(encryptedCert, inputProof);
        euint32 serial = FHE.fromExternal(encryptedSerial, inputProof);
        euint32 origin = FHE.fromExternal(encryptedOrigin, inputProof);
        
        // Configure ACL for all encrypted fields - allow owner and contract
        FHE.allowThis(price);
        FHE.allow(price, msg.sender);
        FHE.allowThis(cert);
        FHE.allow(cert, msg.sender);
        FHE.allowThis(serial);
        FHE.allow(serial, msg.sender);
        FHE.allowThis(origin);
        FHE.allow(origin, msg.sender);
        
        collectibles[tokenId] = Collectible({
            tokenId: tokenId,
            owner: msg.sender,
            name: name,
            imageUri: imageUri,
            encryptedPurchasePrice: price,
            encryptedCertificateNumber: cert,
            encryptedSerialNumber: serial,
            encryptedOriginCode: origin,
            listedAt: block.timestamp,
            exists: true
        });
        
        ownerCollectibles[msg.sender].push(tokenId);
        
        emit CollectibleListed(tokenId, msg.sender, name, block.timestamp);
        return tokenId;
    }

    /// @notice Request to purchase a collectible (buyer submits offer)
    /// @param tokenId The ID of the collectible to purchase
    function requestPurchase(uint256 tokenId) external payable {
        Collectible storage collectible = collectibles[tokenId];
        require(collectible.exists, "Collectible does not exist");
        require(collectible.owner != msg.sender, "Cannot purchase own collectible");
        require(msg.value > 0, "Offer amount must be greater than 0");
        
        uint256 requestId = nextRequestId;
        nextRequestId++;
        address owner = collectible.owner;
        
        purchaseRequests[requestId] = PurchaseRequest({
            requestId: requestId,
            tokenId: tokenId,
            buyer: msg.sender,
            offerAmount: msg.value,
            isPending: true,
            isApproved: false,
            timestamp: block.timestamp
        });
        
        tokenPurchaseRequests[tokenId].push(requestId);
        buyerRequests[msg.sender].push(requestId);
        ownerPendingRequests[owner].push(requestId);
        
        emit PurchaseRequested(requestId, tokenId, msg.sender, msg.value, owner);
    }

    /// @notice Approve a purchase request (owner approves buyer's offer)
    /// @param requestId The ID of the purchase request
    function approvePurchase(uint256 requestId) external {
        PurchaseRequest storage request = purchaseRequests[requestId];
        require(request.requestId == requestId && request.timestamp > 0, "Request does not exist");
        require(request.isPending, "Request is not pending");
        
        Collectible storage collectible = collectibles[request.tokenId];
        require(collectible.owner == msg.sender, "Only owner can approve");
        require(collectible.exists, "Collectible does not exist");
        
        address buyer = request.buyer;
        address previousOwner = collectible.owner;
        uint256 offerAmount = request.offerAmount;
        
        // Mark request as approved
        request.isPending = false;
        request.isApproved = true;
        
        // Transfer payment to previous owner
        (bool success, ) = previousOwner.call{value: offerAmount}("");
        require(success, "Payment transfer failed");
        
        // Update ownership
        collectible.owner = buyer;
        
        // Update ACL - grant new owner permissions
        FHE.allow(collectible.encryptedPurchasePrice, buyer);
        FHE.allow(collectible.encryptedCertificateNumber, buyer);
        FHE.allow(collectible.encryptedSerialNumber, buyer);
        FHE.allow(collectible.encryptedOriginCode, buyer);
        
        // Auto-reject all other pending requests for this token
        // This ensures that when ownership changes, all other pending offers are automatically rejected
        uint256[] storage tokenRequests = tokenPurchaseRequests[request.tokenId];
        for (uint256 i = 0; i < tokenRequests.length; i++) {
            uint256 otherRequestId = tokenRequests[i];
            if (otherRequestId != requestId) {
                PurchaseRequest storage otherRequest = purchaseRequests[otherRequestId];
                if (otherRequest.isPending) {
                    // Mark as rejected
                    otherRequest.isPending = false;
                    otherRequest.isApproved = false;
                    
                    // Refund the buyer
                    address otherBuyer = otherRequest.buyer;
                    uint256 otherAmount = otherRequest.offerAmount;
                    (bool refundSuccess, ) = otherBuyer.call{value: otherAmount}("");
                    require(refundSuccess, "Refund failed");
                    
                    // Remove from ownerPendingRequests
                    _removeFromArray(ownerPendingRequests[previousOwner], otherRequestId);
                    
                    emit PurchaseRejected(otherRequestId, request.tokenId, otherBuyer);
                }
            }
        }
        
        // Remove approved request from ownerPendingRequests
        _removeFromArray(ownerPendingRequests[previousOwner], requestId);
        
        // Update owner collectibles mapping
        // Remove from old owner (simplified - in production, use proper array removal)
        uint256[] storage oldOwnerList = ownerCollectibles[previousOwner];
        for (uint256 i = 0; i < oldOwnerList.length; i++) {
            if (oldOwnerList[i] == request.tokenId) {
                oldOwnerList[i] = oldOwnerList[oldOwnerList.length - 1];
                oldOwnerList.pop();
                break;
            }
        }
        ownerCollectibles[buyer].push(request.tokenId);
        
        // Record provenance
        provenance[request.tokenId].push(TransferRecord({
            from: previousOwner,
            to: buyer,
            timestamp: block.timestamp,
            txHash: bytes32(0) // In production, use tx.origin or hash
        }));
        
        emit PurchaseApproved(requestId, request.tokenId, buyer, previousOwner, offerAmount);
        emit CollectiblePurchased(request.tokenId, previousOwner, buyer, offerAmount, block.timestamp);
    }

    /// @notice Reject a purchase request (owner rejects buyer's offer and refunds)
    /// @param requestId The ID of the purchase request
    function rejectPurchase(uint256 requestId) external {
        PurchaseRequest storage request = purchaseRequests[requestId];
        require(request.requestId == requestId && request.timestamp > 0, "Request does not exist");
        require(request.isPending, "Request is not pending");
        
        Collectible storage collectible = collectibles[request.tokenId];
        require(collectible.owner == msg.sender, "Only owner can reject");
        
        address buyer = request.buyer;
        uint256 offerAmount = request.offerAmount;
        
        // Mark request as rejected
        request.isPending = false;
        request.isApproved = false;
        
        // Refund the buyer
        (bool success, ) = buyer.call{value: offerAmount}("");
        require(success, "Refund failed");
        
        // Remove from ownerPendingRequests
        _removeFromArray(ownerPendingRequests[msg.sender], requestId);
        
        emit PurchaseRejected(requestId, request.tokenId, buyer);
    }

    /// @notice Internal function to complete purchase (only called after approval)
    /// @dev This is kept for backward compatibility but should not be called directly
    function _completePurchase(uint256 tokenId, address buyer, uint256 price) internal {
        Collectible storage collectible = collectibles[tokenId];
        address previousOwner = collectible.owner;
        
        collectible.owner = buyer;
        
        FHE.allow(collectible.encryptedPurchasePrice, buyer);
        FHE.allow(collectible.encryptedCertificateNumber, buyer);
        FHE.allow(collectible.encryptedSerialNumber, buyer);
        FHE.allow(collectible.encryptedOriginCode, buyer);
        
        ownerCollectibles[previousOwner].pop();
        ownerCollectibles[buyer].push(tokenId);
        
        provenance[tokenId].push(TransferRecord({
            from: previousOwner,
            to: buyer,
            timestamp: block.timestamp,
            txHash: bytes32(0)
        }));
        
        emit CollectiblePurchased(tokenId, previousOwner, buyer, price, block.timestamp);
    }

    /// @notice Get collectible public information
    /// @param tokenId The ID of the collectible
    /// @return name The name of the collectible
    /// @return imageUri The image URI
    /// @return owner The current owner address
    /// @return listedAt The listing timestamp
    /// @return exists Whether the collectible exists
    function getCollectibleInfo(uint256 tokenId)
        external
        view
        returns (
            string memory name,
            string memory imageUri,
            address owner,
            uint256 listedAt,
            bool exists
        )
    {
        Collectible memory collectible = collectibles[tokenId];
        return (
            collectible.name,
            collectible.imageUri,
            collectible.owner,
            collectible.listedAt,
            collectible.exists
        );
    }

    /// @notice Get encrypted metadata (only decryptable by current owner)
    /// @param tokenId The ID of the collectible
    /// @return encryptedPrice Encrypted purchase price
    /// @return encryptedCert Encrypted certificate number
    /// @return encryptedSerial Encrypted serial number
    /// @return encryptedOrigin Encrypted origin code
    function getEncryptedMetadata(uint256 tokenId)
        external
        view
        returns (
            euint32 encryptedPrice,
            euint32 encryptedCert,
            euint32 encryptedSerial,
            euint32 encryptedOrigin
        )
    {
        Collectible memory collectible = collectibles[tokenId];
        require(collectible.exists, "Collectible does not exist");
        return (
            collectible.encryptedPurchasePrice,
            collectible.encryptedCertificateNumber,
            collectible.encryptedSerialNumber,
            collectible.encryptedOriginCode
        );
    }

    /// @notice Get provenance history for a collectible
    /// @param tokenId The ID of the collectible
    /// @return records Array of transfer records
    function getProvenance(uint256 tokenId)
        external
        view
        returns (TransferRecord[] memory)
    {
        return provenance[tokenId];
    }

    /// @notice Get all collectible IDs owned by an address
    /// @param owner The owner address
    /// @return tokenIds Array of token IDs
    function getOwnerCollectibles(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return ownerCollectibles[owner];
    }

    /// @notice Get total number of collectibles
    /// @return count The total count
    function getTotalCollectibles() external view returns (uint256) {
        return nextTokenId;
    }

    /// @notice Get purchase request details
    /// @param requestId The ID of the purchase request
    /// @return request The purchase request details
    function getPurchaseRequest(uint256 requestId)
        external
        view
        returns (PurchaseRequest memory request)
    {
        return purchaseRequests[requestId];
    }

    /// @notice Get all purchase requests for a token
    /// @param tokenId The ID of the collectible
    /// @return requestIds Array of request IDs
    function getTokenPurchaseRequests(uint256 tokenId)
        external
        view
        returns (uint256[] memory requestIds)
    {
        return tokenPurchaseRequests[tokenId];
    }

    /// @notice Get all pending purchase requests for an owner
    /// @param owner The owner address
    /// @return requestIds Array of pending request IDs
    function getOwnerPendingRequests(address owner)
        external
        view
        returns (uint256[] memory requestIds)
    {
        return ownerPendingRequests[owner];
    }

    /// @notice Get all purchase requests made by a buyer
    /// @param buyer The buyer address
    /// @return requestIds Array of request IDs
    function getBuyerRequests(address buyer)
        external
        view
        returns (uint256[] memory requestIds)
    {
        return buyerRequests[buyer];
    }

    /// @notice Internal helper function to remove an element from an array
    /// @param array The array to modify
    /// @param value The value to remove
    function _removeFromArray(uint256[] storage array, uint256 value) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }
}

