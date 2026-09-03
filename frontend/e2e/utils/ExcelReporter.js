import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

class ExcelReporter {
  constructor(options) {
    this.outputFile = options?.outputFile || 'e2e/test-results/System_Test_Report.xlsx';
    this.workbook = new ExcelJS.Workbook();
    this.sheets = {};
    this.lastScenarios = {}; 
  }

  onBegin(config, suite) {
    console.log(`Bắt đầu chạy ${suite.allTests().length} tests. Đang chuẩn bị xuất file Excel...`);
  }

  onTestEnd(test, result) {
    const titlePath = test.titlePath();
    // titlePath format: ['', 'project', 'file.spec.js', 'describe title', 'test title']
    
    // Tìm file .spec.js hoặc .setup.js
    const projectIndex = titlePath.findIndex(t => t.endsWith('.spec.js') || t.endsWith('.setup.js'));
    if (projectIndex === -1) return; // Bỏ qua nếu không phải file test

    const fileName = titlePath[projectIndex];
    let scenarioName = 'Default Scenario';
    let testName = '';

    if (titlePath.length > projectIndex + 2) {
      scenarioName = titlePath[projectIndex + 1];
      testName = titlePath[projectIndex + 2];
    } else if (titlePath.length > projectIndex + 1) {
      testName = titlePath[projectIndex + 1];
    }

    const baseFileName = path.basename(fileName);
    const sheetName = baseFileName.replace('.spec.js', '').replace('.setup.js', '').substring(0, 31);

    // Lấy hoặc tạo Sheet mới dựa trên tên Sheet
    let sheet = this.sheets[sheetName];
    if (!sheet) {
      sheet = this.workbook.addWorksheet(sheetName);
      this.setupSheetHeaders(sheet);
      this.sheets[sheetName] = sheet;
      this.lastScenarios[sheetName] = null;
    }

    // Thêm dòng Scenario màu xanh dương nhạt nếu là Scenario mới
    if (this.lastScenarios[sheetName] !== scenarioName) {
      const scenarioRow = sheet.addRow([scenarioName, '', '', '', '']);
      scenarioRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFFF' } // Light Blue
        };
        cell.font = { bold: true };
      });
      this.lastScenarios[sheetName] = scenarioName;
    }

    // Lấy các bước procedure từ test.step()
    let procedure = '';
    const userSteps = result.steps.filter(s => s.category === 'test.step');
    if (userSteps.length > 0) {
        procedure = userSteps.map((s, index) => `${index + 1}. ${s.title}`).join('\n');
    } else {
        procedure = '1. Run automation script';
    }

    // Xử lý cột Result
    let expectedResult = result.status === 'passed' 
      ? 'Pass: Hệ thống hoạt động đúng như mong đợi.' 
      : `Fail: ${result.error?.message || 'Lỗi không xác định'}`;
    
    // Trích xuất ID từ tên bài test (VD: TC1.1)
    const idMatch = testName.match(/^(TC\d+\.\d+)/);
    const testId = idMatch ? idMatch[1] : '';

    // Thêm dòng Test Case
    const testRow = sheet.addRow([
      testId,
      testName,
      procedure,
      expectedResult,
      'System is configured and running' // Pre-condition mặc định
    ]);

    // Format chữ Xanh/Đỏ cho cột Result
    testRow.getCell(4).font = { color: { argb: result.status === 'passed' ? 'FF00B050' : 'xFFFF0000' } };
    
    // Wrap text cho tất cả các cell trong dòng
    testRow.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  }

  async onEnd(result) {
    const dir = path.dirname(this.outputFile);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    await this.workbook.xlsx.writeFile(this.outputFile);
    console.log(`✅ Xuất báo cáo Excel thành công tại: ${this.outputFile}`);
  }

  setupSheetHeaders(sheet) {
    sheet.columns = [
      { header: 'Test Case ID', key: 'id', width: 15 },
      { header: 'Test Case Description', key: 'description', width: 45 },
      { header: 'Test Case Procedure', key: 'procedure', width: 50 },
      { header: 'Expected Results', key: 'expected', width: 45 },
      { header: 'Pre-conditions', key: 'preconditions', width: 30 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF76933C' } // Màu xanh lá mạ giống ảnh
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }
}

export default ExcelReporter;
