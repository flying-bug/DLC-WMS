UPDATE `inventory_documents`
SET `issue_purpose` = 'STOCKTAKE_ADD'
WHERE `doc_type` = 'IN_PO'
  AND UPPER(`reference_type`) IN ('STOCKTAKE', 'STOCK_TAKE', 'STOCKTAKE_ADJUSTMENT')
  AND (`issue_purpose` IS NULL OR UPPER(`issue_purpose`) = 'OTHER');
