# Clarification Notes: Fix Assembly And Disassembly Management

**Feature**: `[011-fix-assembly-and-disassembly-management]`  
**Created**: 2026-09-06  
**Status**: Decisions confirmed for implementation  
**Related specification**: `spec.md`

Tài liệu này làm rõ và được ưu tiên hơn các nội dung mâu thuẫn trong `spec.md` hoặc feature `006`.

## 1. BOM bị từ chối: Kỹ thuật viên sửa và gửi lại

### Quyết định

Khi Kế toán từ chối BOM ở `PENDING_APPROVAL`, BOM chuyển thành `REJECTED`. Kỹ thuật viên được **chỉnh sửa trực tiếp chính BOM đó** và bấm **Gửi lại duyệt** (*Resubmit*). Không tạo BOM mới chỉ vì bị từ chối.

### Luồng trạng thái

```text
PENDING_APPROVAL --Kế toán từ chối--> REJECTED
REJECTED --Kỹ thuật viên sửa--> REJECTED
REJECTED --Kỹ thuật viên gửi lại--> PENDING_APPROVAL
```

### Quy tắc bắt buộc

- Kế toán phải nhập lý do từ chối; lý do, người từ chối và thời điểm từ chối được lưu/audit.
- Chỉ `ROLE_TECHNICIAN` (hoặc quyền thay thế được cấp hợp lệ) được sửa/gửi lại BOM `REJECTED`.
- Mỗi lần gửi lại phải chạy lại toàn bộ validation BOM như lần gửi đầu: component hợp lệ, số lượng dương và các ràng buộc khác. V011 không kiểm tra cost allocation.
- Khi gửi lại, không xóa lịch sử từ chối trước đó. BOM trở về `PENDING_APPROVAL`, Kế toán nhận thông báo mới và lý do từ chối gần nhất vẫn hiển thị cho Kỹ thuật viên.
- BOM `REJECTED` không được chọn để tạo lệnh. Nếu BOM đã bị khóa do đang được một lệnh hoạt động tham chiếu, không được sửa trực tiếp; phải tạo version BOM mới theo quy tắc khóa BOM trong `spec.md`.

## 2. Ngoại lệ linh kiện lỗi sau khi đã xuất kho

### Quyết định

Nếu Kỹ thuật viên phát hiện linh kiện không thể lắp ráp sau khi Thủ kho đã ghi sổ phiếu xuất, cho phép **hủy Lệnh Lắp ráp**. Lệnh chuyển `CANCELLED`; Thủ kho thực hiện **Bỏ ghi sổ (Unpost)** phiếu xuất liên kết để khôi phục tồn kho và trạng thái serial về đúng trạng thái trước khi xuất.

### Điều kiện được hủy

Chỉ cho phép hủy theo luồng này khi tất cả điều kiện sau đúng:

1. Lệnh là `APPROVED` hoặc `IN_PROGRESS`.
2. Phiếu xuất liên kết là `POSTED`.
3. Phiếu nhập liên kết vẫn `DRAFT` (hoặc đã bị hủy) và **chưa từng `POSTED`**.
4. Kỹ thuật viên đã dừng thao tác vật lý và hoàn trả toàn bộ linh kiện đã xuất, bao gồm serial, cho Thủ kho trước khi unpost.
5. Không có giao dịch kho hoặc phả hệ serial khác phát sinh từ các serial này sau phiếu xuất.

Nếu phiếu nhập đã `POSTED`, không dùng luồng Cancel/Unpost này. Phải xử lý bằng chứng từ đảo/reversal có kiểm soát; trường hợp đó ngoài phạm vi quyết định hiện tại và không được phép unpost ngược phiếu xuất.

### Luồng thực hiện

```text
Phiếu xuất POSTED + phiếu nhập DRAFT
  -> Kỹ thuật viên yêu cầu hủy, nêu lý do lỗi linh kiện
  -> Lệnh = CANCELLED; khóa mọi thao tác post/sửa phiếu nhập
  -> Thủ kho nhận tác vụ “Bỏ ghi sổ phiếu xuất”
  -> Thủ kho xác nhận đã nhận lại đủ vật tư/serial và unpost phiếu xuất
  -> Phiếu xuất = UNPOSTED; tồn kho, cost layer và trạng thái serial được khôi phục
```

### Quy tắc an toàn dữ liệu

- Hủy lệnh phải lưu lý do, người yêu cầu, người xác nhận hủy và thời điểm audit.
- `CANCELLED` có cờ/nhãn `pendingUnpost` cho đến khi phiếu xuất đã `UNPOSTED`; trong thời gian này lệnh vẫn bị khóa và dashboard phải cảnh báo đây là hủy chưa tất toán kho.
- Chỉ `ROLE_WAREHOUSE_CONTROLLER` được unpost sau khi kiểm đếm đủ hàng/serial trả lại. Backend kiểm tra phiếu xuất thuộc lệnh `CANCELLED` và phiếu nhập chưa `POSTED` trước khi cho unpost.
- Unpost phải khôi phục đúng warehouse, quantity, giá vốn và trạng thái serial trước post; không được chỉ cộng số lượng tổng quát.
- Sau unpost, không được mở lại lệnh, tái sử dụng cặp phiếu cũ hoặc tạo thêm phiếu cho lệnh `CANCELLED`. Nếu vẫn cần lắp, tạo lệnh mới.

### Lưu ý nghiệp vụ quan trọng

Việc unpost chỉ an toàn khi linh kiện vẫn có thể được trả nguyên trạng vào kho. Nếu linh kiện **bị hỏng vật lý trong quá trình lắp** và không thể trả về trạng thái tồn trước đó, không được dùng unpost để làm tồn kho “tốt” tăng trở lại. Khi đó cần một chứng từ điều chỉnh/phế liệu hoặc quy trình sửa chữa riêng; đây là hạng mục cần bổ sung nếu doanh nghiệp muốn xử lý trường hợp hỏng vật lý thực tế.

## 3. Số lượng hoàn thành: All or Nothing

### Quyết định

V011 áp dụng **All or Nothing**. Một lệnh lắp ráp/tháo dỡ chỉ hoàn thành khi kết quả nhập kho đúng bằng **toàn bộ số lượng đã duyệt**. Không hỗ trợ hoàn thành từng phần, nhiều đợt hay nhiều cặp phiếu kho.

### Quy tắc

- Phiếu xuất và phiếu nhập tự sinh mang số lượng kế hoạch bằng toàn bộ số lượng lệnh.
- Hệ thống chặn post phiếu nhập nếu số lượng thực nhận không khớp toàn bộ số lượng yêu cầu của lệnh, trừ các chính sách phế liệu được đặc tả riêng trong tương lai.
- Lệnh chỉ chuyển `COMPLETED` khi cả phiếu xuất và phiếu nhập đều `POSTED` và quantity của hai phía thỏa công thức BOM cho toàn bộ lệnh.
- Nếu Kỹ thuật viên chỉ có thể hoàn thành một phần, phải hủy lệnh theo mục 2, hoàn trả vật tư trước khi unpost, rồi tạo lệnh mới với số lượng thực sự có thể hoàn thành.
- Không được thay đổi quantity của lệnh đã được duyệt để biến một lệnh dang dở thành lệnh hoàn thành một phần.

### Ví dụ

Lệnh lắp 10 bộ PC đã được duyệt. Sau khi xuất linh kiện, Kỹ thuật viên chỉ có thể hoàn thành 7 bộ. Hệ thống không cho nhập 7 bộ và hoàn thành lệnh. Kỹ thuật viên phải hoàn trả vật tư của 10 bộ, hủy lệnh, Thủ kho unpost phiếu xuất, sau đó tạo lệnh mới cho 7 bộ (hoặc số lượng đã được xác nhận có thể hoàn thành).

## 4. Thay đổi cần phản ánh vào spec và implementation plan

- Thay quy tắc “đã có chứng từ liên kết thì luôn chặn hủy” trong `spec.md` bằng ngoại lệ Cancel/Unpost có điều kiện ở mục 2.
- Bổ sung `CANCELLED` và trạng thái/cờ hủy chưa tất toán (`pendingUnpost`) vào mô hình dữ liệu, API response, UI và audit log.
- Chặn unpost phiếu xuất nếu phiếu nhập liên kết đã `POSTED`; chặn post/sửa phiếu nhập khi lệnh đã `CANCELLED`.
- Bỏ toàn bộ partial fulfillment; test phải bao gồm tình huống nhập thiếu và kiểm tra hệ thống chặn.
- Bổ sung integration tests cho: reject-resubmit BOM, cancel sau export post, khôi phục serial/tồn/cost khi unpost, và từ chối cancel/unpost khi import đã post.

## 5. Các case đã chốt để triển khai

Theo yêu cầu triển khai tuần tự, các hướng “Khuyến nghị” dưới đây được chọn làm rule v011: lệnh bị từ chối được resubmit; Kỹ thuật viên yêu cầu hủy và Kế toán xác nhận; không reservation; hỏng vật lý/reversal sau nhập nằm ngoài scope và bị chặn; serial tháo dỡ ưu tiên khôi phục serial cũ; phiếu draft chỉ cảnh báo, không tự hủy.

### 5.1. Lệnh bị từ chối: có sửa và gửi lại không?

**Case**: Kế toán từ chối Assembly Order ở `PENDING_APPROVAL`.

**Quyết định**: Kỹ thuật viên được sửa trực tiếp lệnh `REJECTED` rồi gửi lại.

**Rule áp dụng**: Kỹ thuật viên sửa trực tiếp lệnh `REJECTED`, bấm `Resubmit` để đưa lệnh về `PENDING_APPROVAL`. Lưu toàn bộ lịch sử lý do từ chối và gửi lại. Vì lệnh bị từ chối chưa sinh chứng từ kho, cách này không làm lệch tồn kho.

### 5.2. Hủy lệnh khi cặp phiếu đã tạo nhưng chưa ghi sổ

**Case**: Lệnh `APPROVED`, hệ thống đã tạo phiếu xuất và nhập `DRAFT`, nhưng Thủ kho chưa ghi sổ phiếu nào.

**Quyết định**: Khi hủy lệnh, cả hai chứng từ `DRAFT` chuyển `CANCELLED` và được giữ để audit.

**Rule áp dụng**: Cho phép hủy; chuyển cả hai chứng từ sang `CANCELLED` (không xóa vật lý để bảo toàn audit), rồi chuyển lệnh sang `CANCELLED`. Không tạo hay tái sử dụng cặp phiếu mới cho lệnh này.

### 5.3. Thẩm quyền yêu cầu và phê duyệt hủy sau khi xuất kho

**Case**: Phiếu xuất đã `POSTED`; Kỹ thuật viên phát hiện lỗi và muốn hủy.

**Quyết định**: Kỹ thuật viên yêu cầu hủy, Kế toán xác nhận, Thủ kho unpost.

**Rule áp dụng**: Kỹ thuật viên chỉ tạo **yêu cầu hủy** kèm lý do; Kế toán xác nhận yêu cầu để bảo đảm kiểm soát tài sản; Thủ kho kiểm đếm hàng trả lại và thực hiện unpost. Audit đủ ba actor.

### 5.4. Đồng thời giữa Cancel, Post và Unpost

**Case**: Một người đang post phiếu nhập trong khi người khác gửi hủy lệnh; hoặc hai lần unpost được gửi gần như đồng thời.

**Quyết định**: Dùng optimistic lock và unique constraint để chỉ một thao tác cạnh tranh thành công.

**Rule áp dụng**: Dùng optimistic lock trên lệnh và unique constraint trên cặp chứng từ. Mỗi thao tác kiểm tra lại trạng thái trong cùng transaction; chỉ một thao tác thắng. Nếu post nhập thành công trước, yêu cầu hủy/unpost bị từ chối. Nếu hủy được chấp nhận trước, post/sửa phiếu nhập bị chặn.

### 5.5. Đã lắp một phần vật lý nhưng áp dụng All-or-Nothing

**Case**: Lệnh 10 bộ đã xuất đủ vật tư; Kỹ thuật viên đã lắp xong 7 bộ rồi phát hiện không thể hoàn thành 3 bộ còn lại.

**Quyết định**: Phải tháo lại phần đã lắp và hoàn đủ vật tư trước khi unpost.

**Rule áp dụng**: Vì v011 áp dụng All-or-Nothing, Kỹ thuật viên phải tháo lại các bộ đã lắp và hoàn trả **toàn bộ** component/serial của 10 bộ cho Thủ kho trước khi unpost. Không thể chỉ unpost trong khi 7 bộ vẫn tồn tại vật lý. Sau đó tạo lệnh mới với số lượng thực tế có thể hoàn thành.

### 5.6. Linh kiện bị hỏng vật lý trong lúc thao tác

**Case**: Component đã xuất bị gãy/cháy/mất, không thể trả nguyên trạng vào kho để unpost.

**Quyết định**: Hàng hỏng vật lý ngoài scope v011; không được unpost vào tồn tốt.

**Rule áp dụng**: Không unpost để đưa component trở lại tồn kho tốt. Backend từ chối luồng unpost nếu không hoàn đủ hàng/serial; chứng từ điều chỉnh, kho phế liệu hoặc sửa chữa được tách sang feature riêng.

### 5.7. Lỗi được phát hiện sau khi phiếu nhập đã POSTED

**Case**: Cả hai phiếu đã `POSTED` và lệnh `COMPLETED`, sau đó phát hiện thành phẩm lỗi hoặc thao tác lắp sai.

**Quyết định**: Reversal sau khi phiếu nhập đã `POSTED` ngoài scope v011.

**Rule áp dụng**: Không unpost phiếu xuất/nhập trực tiếp. Backend chặn thao tác và yêu cầu xử lý bằng feature reversal riêng.

### 5.8. Tồn kho thay đổi sau khi Kế toán duyệt lệnh

**Case**: Kế toán thấy đủ tồn tại lúc duyệt, nhưng trước khi Thủ kho ghi sổ, hàng đã được xuất cho chứng từ khác.

**Quyết định**: Duyệt lệnh không tạo reservation.

**Rule áp dụng**: Backend kiểm tra lại tồn và serial ở thời điểm post xuất; nếu thiếu, giữ lệnh ở trạng thái hiện tại, báo lỗi rõ ràng và yêu cầu xử lý kho hoặc hủy lệnh.

### 5.9. Cặp phiếu DRAFT bị treo

**Case**: Lệnh đã duyệt tạo phiếu `DRAFT` nhưng không ai thực hiện trong thời gian dài.

**Quyết định**: Không tự hủy phiếu `DRAFT`; chỉ cảnh báo quá hạn.

**Rule áp dụng**: Khi quá hạn, thông báo Kỹ thuật viên/Kế toán/Thủ kho để chủ động tiếp tục hoặc hủy lệnh. Không tự đổi trạng thái.

### 5.10. Chính sách serial khi tháo dỡ

**Case**: Thành phẩm được tháo dỡ; component thu hồi đã từng có serial trong hệ thống hoặc không còn serial cũ.

**Quyết định**: Ưu tiên khôi phục serial cũ; chỉ tạo serial mới khi không xác định được serial cũ.

**Rule áp dụng**: Nếu component cũ còn nhận diện được, khôi phục đúng serial cũ và mở lại trạng thái khả dụng sau khi kiểm tra không bị dùng ở giao dịch khác. Serial mới phải giữ liên kết với lệnh nguồn; backend chặn serial trùng hoặc đang active ở giao dịch khác.

### 5.11. Đơn vị tính và số lượng có serial

**Case**: Một dòng hàng theo serial có quantity thập phân, hoặc số serial quét không đúng với quantity sau quy đổi đơn vị.

**Quyết định**: Hàng quản lý serial chỉ nhận quantity nguyên dương.

**Rule áp dụng**: SKU theo serial chỉ nhận quantity nguyên dương theo đơn vị quản lý serial; số serial unique bằng đúng quantity sau quy đổi. SKU không theo serial dùng precision hiện hành của kho nhưng vẫn phải khớp toàn bộ số lượng BOM.

## 6. Checklist trước khi chuyển sang implementation plan

- [x] Cho sửa và gửi lại Assembly Order bị từ chối.
- [x] Kỹ thuật viên yêu cầu hủy; Kế toán xác nhận; Thủ kho unpost khi đủ điều kiện.
- [x] Hàng hỏng vật lý và reversal sau phiếu nhập `POSTED` nằm ngoài v011; backend chặn unpost không an toàn.
- [x] Không reservation; kiểm tra lại tồn kho/serial khi post xuất.
- [x] Serial tháo dỡ ưu tiên khôi phục serial cũ; hàng theo serial dùng quantity nguyên.
- [x] Phiếu `DRAFT` quá hạn chỉ cảnh báo, không tự hủy.
