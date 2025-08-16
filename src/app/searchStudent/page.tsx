"use client";

import { useState } from "react";
import Header from "../Header/page";
import Footer from "../Footer/page";
import "./page.css";
import Image from "next/image";
import linkedin from "@/assets/LinkedIn.png";
import Github from "@/assets/Github.png";
import Leetcode from "@/assets/Leetcode.png";

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

export default function AdminUserSearch() {
  const [searchValue, setSearchValue] = useState("");
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    setLoading(true);
    setError(null);
    setUserData(null);

    try {
      const res = await fetch(
        `/api/searchStudent?query=${encodeURIComponent(searchValue)}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch user data.");
      }
        const data = await res.json();
      setUserData(data.userByUsername || data.userByEmail);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="w-[95%] min-h-[85vh] lg:w-full max-w-6xl mx-auto py-10 md:py-16 px-4">
        <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
          Search User
        </h2>

        <div className="flex justify-center gap-3 mb-10">
          <input
            type="text"
            placeholder="Enter email or username"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="md:text-lg w-80 border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-indigo-200"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="cursor-pointer md:text-lg px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && (
          <p className="text-center text-red-600 font-medium mb-6">{error}</p>
        )}

        {userData && (
          <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-4">
              {userData.name}
            </h3>

            {userData.resume && (
              <div className="flex items-center gap-4 mb-4">
                <span className="font-medium text-gray-700">Resume:</span>
                <a
                  href={userData.resume}
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
                <p>{userData.username}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Enrollment Number</p>
                <p>{userData.enrollmentNumber}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">College Email</p>
                <p>{userData.collegeEmail}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Phone</p>
                <p>{userData.phone}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Department</p>
                <p>{userData.department}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">10th Percentage</p>
                <p>{userData.tenthPercentage}%</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">12th Percentage</p>
                <p>{userData.twelfthPercentage}%</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">College GPA</p>
                <p>{userData.collegeGPA}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Batch</p>
                <p>
                  {userData.batchStart} - {userData.batchEnd}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Status</p>
                <p>{userData.status}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {userData.linkedin && (
                <div className="flex items-center gap-3">
                  <Image src={linkedin} height={25} alt="LinkedIn" />
                  <a
                    href={`https://linkedin.com/in/${userData.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
              {userData.github && (
                <div className="flex items-center gap-3">
                  <Image src={Github} height={25} alt="Github" />
                  <a
                    href={`https://github.com/${userData.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    GitHub
                  </a>
                </div>
              )}
              {userData.leetcode && (
                <div className="flex items-center gap-3">
                  <Image src={Leetcode} height={25} alt="Leetcode" />
                  <a
                    href={`https://leetcode.com/u/${userData.leetcode}`}
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
      </main>
      <Footer />
    </>
  );
}
