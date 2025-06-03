// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILinkToken {
    /**
     * @notice Transfers tokens to a specified address and then calls a function on the recipient.
     * @param to The address to transfer tokens to.
     * @param value The amount of tokens to transfer.
     * @param data The data to pass to the recipient contract.
     * @return success Returns true if the operation was successful.
     */
    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool success);
}
