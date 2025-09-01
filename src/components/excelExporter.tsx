import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
interface UserProfile {
  name: string;
  username: string;
  enrollmentNumber: string;
  collegeEmail: string;
  phone: number;
  department: string;
  tenthPercentage: number;
  twelfthPercentage: number;
  collegeGPA: number;
  batchStart: number;
  batchEnd: number;
  linkedin: string;
  github: string;
  leetcode: string;
  status: string;
  resume: string;
}

async function exportToExcel(
  students: UserProfile[],
  fileName: string = "students.xlsx"
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Students");

  worksheet.columns = [
    { header: "Name", key: "name", width: 20 },
    { header: "Username", key: "username", width: 20 },
    { header: "Enrollment No.", key: "enrollmentNumber", width: 20 },
    { header: "College Email", key: "collegeEmail", width: 30 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Department", key: "department", width: 20 },
    { header: "10th %", key: "tenthPercentage", width: 10 },
    { header: "12th %", key: "twelfthPercentage", width: 10 },
    { header: "GPA", key: "collegeGPA", width: 10 },
    { header: "Batch Start", key: "batchStart", width: 15 },
    { header: "Batch End", key: "batchEnd", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "LinkedIn", key: "linkedin", width: 30 },
    { header: "GitHub", key: "github", width: 30 },
    { header: "LeetCode", key: "leetcode", width: 30 },
    { header: "Resume", key: "resume", width: 30 },
  ];

  students.forEach((s) => worksheet.addRow(s));

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}

export default exportToExcel;