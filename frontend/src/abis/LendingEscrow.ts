// This file contains the ABI for the LendingEscrow contract
export default {
  "abi": [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_subscriptionToken",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "listingId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "lender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "pricePerHour",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "maxDuration",
          "type": "uint256"
        }
      ],
      "name": "ListingCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "listingId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "lender",
          "type": "address"
        }
      ],
      "name": "ListingRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "listingId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "borrower",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "duration",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "RentalStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "listingId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "lender",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "borrower",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amountReturned",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        }
      ],
      "name": "RentalEnded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_pricePerHour",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_maxDuration",
          "type": "uint256"
        }
      ],
      "name": "createListing",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_listingId",
          "type": "uint256"
        }
      ],
      "name": "endRental",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_listingId",
          "type": "uint256"
        }
      ],
      "name": "getListing",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "lender",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "pricePerHour",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxDuration",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isActive",
              "type": "bool"
            },
            {
              "internalType": "address",
              "name": "currentBorrower",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "rentalStartTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "rentalDuration",
              "type": "uint256"
            }
          ],
          "internalType": "struct LendingEscrow.Listing",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_listingId",
          "type": "uint256"
        }
      ],
      "name": "removeListing",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_listingId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_duration",
          "type": "uint256"
        }
      ],
      "name": "startRental",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_listingId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_newPricePerHour",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_newMaxDuration",
          "type": "uint256"
        }
      ],
      "name": "updateListing",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdrawFees",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
}
