import { NextResponse } from "next/server";

export async function GET() {
  const template = {
    title: "Sample Quiz",
    description: "Short description of the quiz",
    timeLimitSeconds: 600,
    questions: [
      {
        text: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctIndex: 1
      },
      {
        text: "Select the capital of France",
        options: ["Berlin", "Madrid", "Paris", "Rome"],
        correctIndex: 2
      }
    ]
  };

  const body = JSON.stringify(template, null, 2);
  const res = new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": "attachment; filename=quiz-template.json"
    }
  });
  return res;
}


