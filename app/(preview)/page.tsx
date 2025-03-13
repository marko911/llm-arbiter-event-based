"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileUp, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AnimatePresence, motion, progress } from "framer-motion";

interface AnalysisResponse {
  data: {
    synthesis: string;
    confidence: number;
    analysis: string;
    dissent: string;
    needsIteration: boolean;
    refinementAreas: string;
  };
  displayName: string;
}

export default function ChatWithFiles() {
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isSafari && isDragging) {
      toast.error(
        "Safari does not support drag & drop. Please use the file picker."
      );
      return;
    }

    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(
      (file) =>
        file.type === "application/json" && file.size <= 15 * 1024 * 1024
    );

    if (validFiles.length !== selectedFiles.length) {
      toast.error("Only JSON files under 15MB are allowed.");
    }

    setFiles(validFiles);
  };

  const handleSubmitWithFiles = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const fileData = await files[0].text();
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: [{ name: files[0].name, data: fileData }],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate analysis");
      }

      const result = await response.json();
      console.log("result", result);
      setAnalysis(result.message || null);
    } catch (error) {
      toast.error("Failed to generate analysis. Please try again.");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (analysis) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-12 p-6">
        <CardHeader>
          <CardTitle>Financial Analysis</CardTitle>
          <CardDescription>
            Confidence Score: {analysis.data.confidence}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose dark:prose-invert space-y-4">
            <div>
              <h2>Synthesis</h2>
              <div className="whitespace-pre-wrap">
                {analysis.data.synthesis}
              </div>
            </div>
            <div>
              <h2>Analysis of Model Responses</h2>
              <div className="whitespace-pre-wrap">
                {analysis.data.analysis}
              </div>
            </div>
            <div>
              <h2>Dissenting Views</h2>
              <div className="whitespace-pre-wrap">{analysis.data.dissent}</div>
            </div>
            <div>
              {analysis.data.refinementAreas && (
                <>
                  <h2>Areas for Refinement</h2>
                  <div className="whitespace-pre-wrap">
                    {analysis.data.refinementAreas}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => {
              setFiles([]);
              setAnalysis(null);
            }}
          >
            Generate New Analysis
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div
      className="min-h-[100dvh] w-full flex justify-center"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragExit={() => setIsDragging(false)}
      onDragEnd={() => setIsDragging(false)}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        console.log(e.dataTransfer.files);
        handleFileChange({
          target: { files: e.dataTransfer.files },
        } as React.ChangeEvent<HTMLInputElement>);
      }}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="fixed pointer-events-none dark:bg-zinc-900/90 h-dvh w-dvw z-10 justify-center items-center flex flex-col gap-1 bg-zinc-100/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div>Drag and drop files here</div>
            <div className="text-sm dark:text-zinc-400 text-zinc-500">
              {"(JSONs only)"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Card className="w-full max-w-md h-full border-0 sm:border sm:h-fit mt-12">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto flex items-center justify-center space-x-2 text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-2">
              <FileUp className="h-6 w-6" />
            </div>
            <Plus className="h-4 w-4" />
            <div className="rounded-full bg-primary/10 p-2">
              <Loader2 className="h-6 w-6" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">
              JSON Financial Analyzer
            </CardTitle>
            <CardDescription className="text-base">
              Upload a JSON file to generate a financial analysis.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitWithFiles} className="space-y-4">
            <div
              className={`relative flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:border-muted-foreground/50`}
            >
              <input
                type="file"
                onChange={handleFileChange}
                accept="application/json"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {files.length > 0 ? (
                  <span className="font-medium text-foreground">
                    {files[0].name}
                  </span>
                ) : (
                  <span>Drop your JSON here or click to browse.</span>
                )}
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={files.length === 0}
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Analysis...</span>
                </span>
              ) : (
                "Generate Analysis"
              )}
            </Button>
          </form>
        </CardContent>
        {isLoading && (
          <CardFooter className="flex flex-col space-y-4">
            <div className="w-full space-y-2">
              <div className="grid grid-cols-6 sm:grid-cols-4 items-center space-x-2 text-sm">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isLoading ? "bg-yellow-500/50 animate-pulse" : "bg-muted"
                  }`}
                />
                <span className="text-muted-foreground text-center col-span-4 sm:col-span-2">
                  Analyzing JSON content
                </span>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
