package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho entity Brand (bảng BRANDS).
 * <p>
 * Cung cấp các query method phục vụ CRUD Brand Management (UC-36 đến UC-40).
 */
@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {

    /**
     * UC-36: Tìm kiếm thương hiệu theo tên hoặc mã (case-insensitive).
     * Hỗ trợ tìm kiếm theo keyword trong search bar.
     *
     * @param keyword từ khóa tìm kiếm
     * @return danh sách thương hiệu phù hợp
     */
    @Query("SELECT b FROM Brand b WHERE LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(b.code) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY b.createdAt DESC")
    List<Brand> searchBrands(@Param("keyword") String keyword);

    /**
     * Lấy toàn bộ danh sách thương hiệu, sắp xếp theo ngày tạo mới nhất.
     *
     * @return danh sách thương hiệu
     */
    @Query("SELECT b FROM Brand b ORDER BY b.createdAt DESC")
    List<Brand> findAllOrderByCreatedAtDesc();

    /**
     * BR-09: Kiểm tra mã thương hiệu đã tồn tại chưa (khi tạo mới).
     *
     * @param code mã cần kiểm tra
     * @return true nếu đã tồn tại
     */
    boolean existsByCode(String code);

    /**
     * BR-09: Kiểm tra mã thương hiệu đã tồn tại chưa, ngoại trừ bản ghi hiện tại (khi cập nhật).
     *
     * @param code mã cần kiểm tra
     * @param id   ID của bản ghi hiện tại (loại trừ khỏi kiểm tra)
     * @return true nếu mã đã tồn tại ở bản ghi khác
     */
    boolean existsByCodeAndIdNot(String code, Long id);

    /**
     * Tìm thương hiệu theo mã (Mã NSX).
     *
     * @param code mã thương hiệu
     * @return Optional chứa brand nếu tìm thấy
     */
    Optional<Brand> findByCode(String code);

    /**
     * BR-11: Kiểm tra thương hiệu có đang được liên kết với sản phẩm nào không.
     * Nếu có, không được phép xóa vật lý → chỉ đổi status INACTIVE.
     *
     * @param brandId ID thương hiệu cần kiểm tra
     * @return số lượng sản phẩm đang liên kết với thương hiệu này
     */
    @Query("SELECT COUNT(p) FROM Product p WHERE p.brand.id = :brandId")
    long countLinkedProducts(@Param("brandId") Long brandId);
}
