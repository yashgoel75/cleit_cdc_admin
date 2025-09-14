"use client";

import { useState, useEffect, useMemo, useDeferredValue, useRef } from "react";
import Header from "../Header/page";
import Footer from "../Footer/page";
import "./page.css";
import Image from "next/image";
import linkedin from "@/assets/LinkedIn.png";
import Github from "@/assets/Github.png";
import Leetcode from "@/assets/Leetcode.png";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getFirebaseToken } from "@/utils";

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

async function exportToExcelGrouped(
  groupedStudents: Record<string, Record<string, UserProfile[]>>,
  fileName: string = "students_grouped.xlsx"
) {
  const workbook = new ExcelJS.Workbook();

  for (const [year, departments] of Object.entries(groupedStudents)) {
    const worksheet = workbook.addWorksheet(year);

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

    let rowPointer = 2;

    for (const [dept, students] of Object.entries(departments)) {
      const deptRow = worksheet.addRow([`${dept} (${students.length})`]);
      deptRow.font = { bold: true };
      worksheet.mergeCells(`A${rowPointer}:P${rowPointer}`);
      rowPointer++;

      students.forEach((s) => {
        worksheet.addRow(s);
        rowPointer++;
      });

      worksheet.addRow([]);
      rowPointer++;
    }

    worksheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}

export default function AdminUserSearch() {
  const [searchValue, setSearchValue] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  function getStudentYear(batchEnd: number, cutoffMonth = 6): string {
    const now = new Date();
    const academicEndYear =
      now.getMonth() >= cutoffMonth ? now.getFullYear() + 1 : now.getFullYear();
    const diff = batchEnd - academicEndYear;

    const yearMap: Record<number, string> = {
      0: "4th Year",
      1: "3rd Year",
      2: "2nd Year",
      3: "1st Year",
    };

    if (diff < 0) return "Graduated";
    if (diff > 3) return "Future";
    return yearMap[diff] ?? "Unknown";
  }

  const [isMobile, setISMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setISMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [isRefresh, setIsRefresh] = useState(false);
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const token = await getFirebaseToken();
        const res = await fetch("/api/getAllStudents", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch students.");
        const data = await res.json();
        setAllStudents(data.students || []);
        setError(null);
      } catch (err) {
        setError("Failed to fetch students.");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [isRefresh]);

  const deferredQuery = useDeferredValue(searchValue);
  const filteredStudents = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return allStudents;

    return allStudents.filter((s) => {
      const year = getStudentYear(s.batchEnd);
      const haystack = [
        s.name,
        s.username,
        s.collegeEmail,
        s.department,
        s.enrollmentNumber,
        String(s.phone),
        String(s.batchStart),
        String(s.batchEnd),
        year,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [allStudents, deferredQuery]);

  useEffect(() => {
    if (searchValue) setError(null);
  }, [searchValue]);

  useEffect(() => {
    if (
      selectedUser &&
      !filteredStudents.some((s) => s.username === selectedUser.username)
    ) {
      setSelectedUser(null);
    }
  }, [filteredStudents, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      setTimeout(() => {
        mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [selectedUser]);

  const groupedStudents: Record<
    string,
    Record<string, UserProfile[]>
  > = useMemo(() => {
    return allStudents.reduce((acc, student) => {
      const year = getStudentYear(student.batchEnd);
      if (!acc[year]) acc[year] = {};
      if (!acc[year][student.department]) acc[year][student.department] = [];
      acc[year][student.department].push(student);
      return acc;
    }, {} as Record<string, Record<string, UserProfile[]>>);
  }, [allStudents]);

  const groupedFilteredStudents: Record<
    string,
    Record<string, UserProfile[]>
  > = useMemo(() => {
    return filteredStudents.reduce((acc, student) => {
      const year = getStudentYear(student.batchEnd);
      if (!acc[year]) acc[year] = {};
      if (!acc[year][student.department]) acc[year][student.department] = [];
      acc[year][student.department].push(student);
      return acc;
    }, {} as Record<string, Record<string, UserProfile[]>>);
  }, [filteredStudents]);

  const fixedYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const otherYears = Object.keys(groupedFilteredStudents).filter(
    (y) => !fixedYears.includes(y)
  );

  const isSearching = Boolean(searchValue.trim());
  const displayYears = isSearching
    ? Object.keys(groupedFilteredStudents)
    : [...fixedYears, ...otherYears];

  const expandAllMatches = isSearching && displayYears.length > 0;

  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [expandedDeptKey, setExpandedDeptKey] = useState<string | null>(null);
  const toggleYear = (year: string) =>
    setExpandedYear((prev) => (prev === year ? null : year));
  const toggleDept = (year: string, dept: string) => {
    const key = `${year}::${dept}`;
    setExpandedDeptKey((prev) => (prev === key ? null : key));
  };

  return (
    <>
      <Header />

      <main
        ref={mainRef}
        className="w-[95%] min-h-[85vh] lg:w-full max-w-6xl mx-auto py-10 md:py-16 px-4"
      >
        <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
          Search User
        </h2>

        <div className="flex justify-center gap-2 mb-6">
          <input
            type="text"
            placeholder="Search Student"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="md:text-lg w-46 md:w-96 border border-gray-300 px-3 lg:pl-5 py-2 rounded-md lg:rounded-full focus:outline-none focus:ring focus:ring-indigo-200"
          />
          {
            <button
              onClick={() => setSearchValue("")}
              className="cursor-pointer md:text-lg px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-md lg:rounded-full"
              aria-label="Clear search"
            >
              {isMobile ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#000000"
                >
                  <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
                </svg>
              ) : (
                "Clear"
              )}
            </button>
          }
          <button
            onClick={() => setIsRefresh(!isRefresh)}
            className="cursor-pointer md:text-lg px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-md lg:rounded-full"
            aria-label="Clear search"
          >
            {isMobile ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#000000"
              >
                <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
              </svg>
            ) : (
              "Refresh"
            )}
          </button>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() =>
              exportToExcelGrouped(groupedStudents, "All_Students_Grouped.xlsx")
            }
            className="px-4 py-2 bg-indigo-500 text-white rounded-md shadow hover:bg-indigo-700 cursor-pointer"
          >
            Download All
          </button>
          {/* <button
            onClick={() =>
              exportToExcelGrouped(
                groupedFilteredStudents,
                "Filtered_Students.xlsx"
              )
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 cursor-pointer"
          >
            Download Current View
          </button> */}
        </div>

        {loading && (
          <p className="text-center text-gray-600 mb-4">Loading students…</p>
        )}
        {error && (
          <p className="text-center text-red-600 font-medium mb-4">{error}</p>
        )}
        {!loading && !error && searchValue && filteredStudents.length === 0 && (
          <p className="text-center text-gray-700 mb-4">
            No matches for “{searchValue}”.
          </p>
        )}

        {selectedUser && (
          <div className="bg-white p-6 rounded-xl shadow-md space-y-6 mb-8">
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-4">
              {selectedUser.name}
            </h3>

            {selectedUser.resume && (
              <div className="flex items-center gap-4 mb-4">
                <span className="font-medium text-gray-700">Resume:</span>
                <a
                  href={selectedUser.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md shadow hover:bg-indigo-700"
                >
                  📄 View Resume
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <p className="font-medium text-gray-700">Username</p>
                <p>{selectedUser.username}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Enrollment Number</p>
                <p>{selectedUser.enrollmentNumber}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">College Email</p>
                <p>{selectedUser.collegeEmail}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Phone</p>
                <p>{selectedUser.phone}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Department</p>
                <p>{selectedUser.department}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">10th Percentage</p>
                <p>{selectedUser.tenthPercentage}%</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">12th Percentage</p>
                <p>{selectedUser.twelfthPercentage}%</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">College GPA</p>
                <p>{selectedUser.collegeGPA}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Batch</p>
                <p>
                  {selectedUser.batchStart} - {selectedUser.batchEnd}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Status</p>
                <p>{selectedUser.status}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {selectedUser.linkedin && (
                <div className="flex items-center gap-3">
                  <Image src={linkedin} height={25} alt="LinkedIn" />
                  <a
                    href={
                      selectedUser.linkedin.startsWith("http")
                        ? selectedUser.linkedin
                        : `https://linkedin.com/in/${selectedUser.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    LinkedIn
                  </a>
                </div>
              )}

              {selectedUser.github && (
                <div className="flex items-center gap-3">
                  <Image src={Github} height={25} alt="Github" />
                  <a
                    href={
                      selectedUser.github.startsWith("http")
                        ? selectedUser.github
                        : `https://github.com/${selectedUser.github}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    GitHub
                  </a>
                </div>
              )}

              {selectedUser.leetcode && (
                <div className="flex items-center gap-3">
                  <Image src={Leetcode} height={25} alt="Leetcode" />
                  <a
                    href={
                      selectedUser.leetcode.startsWith("http")
                        ? selectedUser.leetcode
                        : `https://leetcode.com/u/${selectedUser.leetcode}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    LeetCode
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {displayYears.map((year) => {
          const depts = groupedFilteredStudents[year];
          const yearCount = depts
            ? Object.values(depts).reduce((sum, arr) => sum + arr.length, 0)
            : 0;
          const showYearContent = expandAllMatches || expandedYear === year;

          return (
            <div
              key={year}
              className="mb-6 border border-gray-300 shadow-md rounded-lg p-4 bg-gray-50"
            >
              <button
                onClick={() => {
                  if (!expandAllMatches) toggleYear(year);
                }}
                className="w-full flex justify-between items-center text-left text-xl text-gray-800 hover:cursor-pointer"
              >
                <span className="font-semibold text-base md:text-lg">
                  {year}
                </span>
                <span className="text-gray-600 text-sm">{yearCount}</span>
              </button>

              {showYearContent && (
                <div className="mt-2">
                  {depts ? (
                    Object.entries(depts).map(([dept, students]) => {
                      const key = `${year}::${dept}`;
                      const showDeptContent =
                        expandAllMatches || expandedDeptKey === key;
                      return (
                        <div key={key} className="mb-4">
                          <button
                            onClick={() => {
                              if (!expandAllMatches) toggleDept(year, dept);
                            }}
                            className="flex justify-between items-center w-full md:text-lg text-gray-800 hover:cursor-pointer"
                          >
                            <span>{dept}</span>
                            <span className="text-gray-600 text-sm">
                              {students.length}
                            </span>
                          </button>

                          {showDeptContent && (
                            <ul className="md:pl-4 mt-2 space-y-3">
                              {students
                                .slice()
                                .sort(
                                  (a, b) =>
                                    Number(a.enrollmentNumber) -
                                    Number(b.enrollmentNumber)
                                )
                                .map((s) => (
                                  <li
                                    key={s.username}
                                    onClick={() => {
                                      setSelectedUser(s);
                                    }}
                                    className="border border-gray-100 p-3 rounded-md bg-white shadow cursor-pointer hover:bg-indigo-50"
                                    title="Click to view profile"
                                  >
                                    <p className="font-medium">
                                      {s.name} ({s.username})
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {s.collegeEmail}
                                    </p>
                                    <p className="text-sm">
                                      Enrollment Number: {s.enrollmentNumber}
                                    </p>
                                    <p className="text-sm">
                                      Status: {s.status}
                                    </p>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-600 italic pl-4">
                      No entries found.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
