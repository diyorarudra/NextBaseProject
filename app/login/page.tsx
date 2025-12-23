"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation"; //

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/login`, {
        email,
        password,
      });

      if (res.data.error) {
        setMsg(res.data.error);
      } else if (res.data.message == "Login successful") {
        // redirect to dashboard page
        router.push("/dashboard"); // <--- this navigates to a new page
      } else {
        setMsg(res.data.message);
      }
    } catch (err: any) {
      setMsg(err.response?.data?.message || err.message || "Something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="w-[350px] space-y-4 shadow-lg p-6 rounded-lg border">
        <h1 className="text-2xl font-bold text-center">Login</h1>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full">
          Login
        </Button>

        <div className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => router.push("/signup")}
          >
            Register
          </span>
        </div>

        {msg && <p className="text-center mt-2 text-red-500 border border-red-200 bg-red-50 p-2 rounded">{msg}</p>}
      </form>
    </div>
  );
}
