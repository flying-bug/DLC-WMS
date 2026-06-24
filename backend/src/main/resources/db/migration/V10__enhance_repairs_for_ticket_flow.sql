ALTER TABLE REPAIRS
  ADD COLUMN expected_date DATE NULL AFTER received_date,
  ADD COLUMN diagnosis_note TEXT NULL AFTER issue_description,
  ADD COLUMN note TEXT NULL AFTER repair_cost;
