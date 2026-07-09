# 5. Requirement Appendix
## 5.2 System Messages

| # | Message code | Message Type | Context | Content |
| :--- | :--- | :--- | :--- | :--- |
| 1 | MSG00 | Toast message | A general action is completed successfully | Success. |
| 2 | MSG01 | In line | There is not any search result | No search results. |
| 3 | MSG02 | In red, under the text box | Input-required fields are empty | The * field is required. |
| 4 | MSG03 | Toast message | Updating an entity successfully | Update data successfully. |
| 5 | MSG04 | Toast message | Adding a new entity successfully | Add data successfully. |
| 6 | MSG05 | Toast message | Deleting an entity successfully | Delete data successfully. |
| 7 | MSG06 | In red, under the text box | Input email address is invalid | Invalid email format. |
| 8 | MSG07 | In red, under the text box | Input phone number is invalid (Vietnam format) | Invalid phone number. |
| 9 | MSG08 | In red, under the text box | Input value length > max length | Exceed max length. |
| 10 | AUTH01 | In line / Popup | Username or password is not correct when clicking sign-in | Incorrect user name or password. Please check again. |
| 11 | AUTH02 | In line / Popup | Requesting a user that does not exist in database | User not found. |
| 12 | AUTH03 | In line / Popup | Account is locked due to failed attempts or unapproved | Account is locked or not approved. |
| 13 | AUTH04 | In red, under the text box | Entering a wrong OTP | Invalid OTP. |
| 14 | AUTH05 | In red, under the text box | Entering an expired OTP | Expired OTP. |
| 15 | AUTH06 | In red, under the text box | Passwords do not match in change password form | Wrong old password. |
| 16 | AUTH07 | Toast message | Google SSO login token is invalid | Invalid Google Token. |
| 17 | AUTH08 | Toast message | Trying to assign dynamic permissions to a non-staff | Only staff can have dynamic permissions. |
| 18 | UNIT01 | Toast message | Requesting a unit that does not exist | Unit not found. |
| 19 | UNIT02 | Toast message | Trying to create a unit with an existing name | Unit name already exists. |
| 20 | PROD01 | Toast message | Requesting a product that does not exist | Product not found. |
| 21 | PROD02 | Toast message | Trying to create a product with an existing unique code | Product code already exists. |
| 22 | PROD03 | Toast message | Trying to delete a product that has related transactions | Cannot delete product because it is in use. |
| 23 | INV01 | Toast message | Trying to create an inventory document with an existing code | Inventory document code already exists. |
| 24 | INV02 | Toast message | Requesting an inventory document that does not exist | Inventory document not found. |
| 25 | INV03 | Toast message | Trying to edit a completed inventory document | Invalid inventory document state. |
| 26 | INV04 | Toast message | Submitting an export slip but quantity exceeds stock | Not enough stock to perform this transaction. |
| 27 | INV05 | Toast message | System cannot find enough cost layers for FIFO calculation | Insufficient cost layers for FIFO export. |
| 28 | INV06 | Toast message | Missing required data for inventory document | Inventory document data is required. |
| 29 | INV07 | Toast message | Scanning a duplicate serial number during import | Serial number already exists in the system. |
| 30 | INV08 | Toast message | Scanning a wrong serial number during export | Serial number not found in the specified warehouse. |
| 31 | INV09 | In red, under the text box | Forgetting to input serials for serial-tracked products | Required serial numbers are missing. |
| 32 | INV10 | Toast message | Source and destination warehouse are the same in a transfer | Source and destination warehouse must be different. |
| 33 | INV11 | Toast message | Modifying warehouse inventory during an active stocktake | Warehouse is locked due to active stocktake. |
| 34 | BOM01 | Toast message | Approving assembly order without enough components | Insufficient component materials to assemble. |
| 35 | WARR01 | Toast message | Requesting warranty for a serial that is out of warranty date | Product is out of warranty. |
| 36 | SYS401 | In line / Popup | Token or session is expired | Your session has expired. |
| 37 | SYS403 | In line / Popup | User tries to access a page without sufficient permissions | Access Denied. You do not have permission. |
| 38 | SYS500 | Toast message | System internal error (500) | An unexpected error occurred. Please contact the administrator. |
| 39 | ASM01 | Toast message | Invalid BOM cost allocation | Tổng tỷ lệ phân bổ giá vốn của các linh kiện phải bằng 100%. |
| 40 | ASM02 | Toast message | BOM locked by active orders | Không thể sửa Định mức lắp ráp vì đang có Lệnh đang sử dụng định mức này. |
| 41 | ASM03 | Toast message | Insufficient target or components | Không đủ tồn kho thành phẩm hoặc linh kiện để thực hiện lệnh. |
| 42 | ASM04 | Toast message | Order has posted docs | Không thể Hủy lệnh vì đã có chứng từ kho (Phiếu Nhập/Xuất) liên quan. |
