"use client";

import "../page.css";
import Header from "../../Header/page";
import Footer from "@/app/Footer/page";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Jobs() {
  interface Job {
    _id?: string;
    company: string;
    role: string;
    location: string;
    description: string;
    deadline: string; // stored as string in form, converted before sending
    linkToApply: string;
  }

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Job>({
    company: "",
    role: "",
    location: "",
    description: "",
    deadline: "",
    linkToApply: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState<string | null>(null);

  const router = useRouter();

  const fetchJobs = async (email: string | null | undefined) => {
    try {
      const res = await fetch(
        `/api/jobs?email=${encodeURIComponent(email || "")}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setJobs(data.jobs);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchJobs(user.email);
      } else {
        router.push("/");
      }
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    if (!currentUser) return;

    const jobData = {
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline) : null,
    };

    const body = editingId
      ? { jobId: editingId, updates: jobData }
      : { newJob: jobData };

    const method = editingId ? "PATCH" : "POST";

    const res = await fetch("/api/jobs", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setFormData({
        company: "",
        role: "",
        location: "",
        description: "",
        deadline: "",
        linkToApply: "",
      });
      setEditingId(null);
      setIsAdding(false);
      fetchJobs(currentUser.email);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    const res = await fetch("/api/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id }),
    });
    if (res.ok) fetchJobs(currentUser.email);
  };

  return (
    <>
      <Header />
      <main className="w-[95%] min-h-[85vh] lg:w-full max-w-6xl mx-auto py-10 md:py-16 px-4">
        <h2 className="text-4xl md:text-4xl font-extrabold text-center text-gray-900 mb-12">
          Manage Jobs
        </h2>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              setFormData({
                company: "",
                role: "",
                location: "",
                description: "",
                deadline: "",
                linkToApply: "",
              });
              setEditingId(null);
              setJobIdToDelete(null);
              setIsAdding(true);
            }}
            className="bg-indigo-500 hover:bg-indigo-700 text-white px-6 py-2 rounded-md cursor-pointer"
          >
            + Add Job
          </button>
        </div>

        {(isAdding || editingId) && (
          <div className="mb-10 bg-gray-50 p-6 rounded-lg shadow-md max-w-xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">
              {editingId ? "Edit Job" : "Add New Job"}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { name: "company", label: "Company Name" },
                { name: "role", label: "Job Title / Role" },
                { name: "location", label: "Location" },
                { name: "description", label: "Job Description" },
                { name: "deadline", label: "Application Deadline" },
                { name: "linkToApply", label: "Link to Apply" },
              ].map(({ name, label }) => (
                <div key={name} className="flex flex-col">
                  <label
                    htmlFor={name}
                    className="mb-1 font-medium text-gray-700"
                  >
                    {label}
                  </label>
                  <input
                    id={name}
                    type={name === "deadline" ? "date" : "text"}
                    value={formData[name as keyof Job]}
                    onChange={(e) =>
                      setFormData({ ...formData, [name]: e.target.value })
                    }
                    placeholder={label}
                    className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div className="flex gap-4 justify-center mt-2">
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md cursor-pointer"
                >
                  {editingId ? "Update" : "Add"}
                </button>
                <button
                  onClick={() => {
                    setFormData({
                      company: "",
                      role: "",
                      location: "",
                      description: "",
                      deadline: "",
                      linkToApply: "",
                    });
                    setEditingId(null);
                    setIsAdding(false);
                  }}
                  className="bg-gray-300 px-5 py-2 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-600">Loading jobs...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : jobs.length === 0 ? (
          <p className="text-center text-gray-600">No jobs found.</p>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="bg-white border rounded-xl shadow-md p-6 hover:shadow-xl"
              >
                <h3 className="text-2xl font-semibold mb-2">{job.company}</h3>
                <p>
                  <span className="font-medium">Role:</span> {job.role}
                </p>
                <p>
                  <span className="font-medium">Location:</span> {job.location}
                </p>
                <p>
                  <span className="font-medium">Deadline:</span>{" "}
                  {job.deadline
                    ? new Date(job.deadline).toLocaleDateString()
                    : "N/A"}
                </p>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => {
                      setFormData(job);
                      setEditingId(job._id!);
                    }}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setJobIdToDelete(job._id!)}
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
                {jobIdToDelete === job._id && (
                  <div className="mt-2 text-red-600">
                    Are you sure?
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleDelete(job._id!)}
                        className="hover:cursor-pointer"
                      >
                        Yes
                      </button>
                      <button className="cursor-pointer" onClick={() => setJobIdToDelete(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
