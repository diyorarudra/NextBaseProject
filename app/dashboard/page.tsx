"use client";

import { socket } from "@/lib/socket";
import { useAtom } from "jotai";
import { filesAtom } from "@/store/filesAtom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useState, useEffect } from "react";
import axios from "axios";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type FileType = {
  _id: string;
  filename: string;
  user: string;
  status: string;
  type?: "image" | "video";
  thumbnail?: string;
};
export default function DashboardPage() {
  // const [files, setFiles] = useState<FileType[]>([]);
  const [files, setFiles] = useAtom(filesAtom);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    socket.on("file-status", (data) => {
      console.log("data", data);


      setFiles((prev) =>
        prev.map((file) =>
          file._id === data._id
            ? { ...file, ...data }
            : file
        )
      );
    });

    return () => {
      socket.off("file-status");
    };
  }, [setFiles]);

  const fetchFiles = async () => {
    const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/files`);
    setFiles(res.data);
  };

  useEffect(() => {
    fetchFiles();
  }, []);
  const handleUpload = async () => {
    if (!selectedFiles) return;

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) =>
      formData.append("file", file)
    );

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/upload`, formData);
      setMsg("✅ Upload successful!");
      setSelectedFiles(null);
      fetchFiles();
    } catch (err: any) {
      setMsg(err.response?.data?.message || "❌ Upload failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>📂 File Upload Dashboard</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="file"
            multiple
            onChange={(e) => setSelectedFiles(e.target.files)}
          />

          <Button onClick={handleUpload} className="w-full">
            Upload Files
          </Button>

          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      <Separator />

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>📄 Uploaded Files</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Thumbnail</TableHead>
                <TableHead>Download</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {files.map((file) => (
                <TableRow key={file._id}>
                  {/* File name */}
                  <TableCell>{file.filename}</TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={
                        file.status === "completed"
                          ? "default"
                          : file.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {file.status}
                    </Badge>
                  </TableCell>

                  {/* Thumbnail */}
                  <TableCell>
                    {file.status === "completed" ? (
                      // <img
                      //   src={`http://backend:5000/thumbnails/${file.filename}`}
                      //   alt="thumb"
                      //   className="w-16 h-16 rounded object-cover"
                      // />
                      <img
                        src={
                          file.type === "image"
                            ? `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/thumbnails/${file.thumbnail}`
                            : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/video-thumbnails/${file.thumbnail}`
                        }
                        className="w-16 h-16 rounded object-cover"
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Download */}
                  <TableCell>
                    {file.status === "completed" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          window.open(
                            `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/download/${file.filename}`,
                            "_blank"
                          )
                        }
                      >
                        Download
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* <CardContent>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files uploaded yet
            </p>
          ) : (
            <ul className="space-y-3">
              {files.map((file) => (
                <li
                  key={file._id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <span className="font-medium">{file.filename}</span>

                  <Badge variant="secondary">
                    {file.status || "uploaded"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent> */}
      </Card>
    </div>
  );
}
