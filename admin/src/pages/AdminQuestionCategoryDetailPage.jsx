import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useGetQuestionCategoriesQuery } from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/ui/Loader";

export default function AdminQuestionCategoryDetailPage() {
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: categoriesRes, isLoading } = useGetQuestionCategoriesQuery();

  const categories = useMemo(
    () => (Array.isArray(categoriesRes?.data) ? categoriesRes.data : []),
    [categoriesRes]
  );

  const category = categories.find((cat) => cat._id === id);
  const questions = Array.isArray(category?.questions) ? category.questions : [];

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
    return <div>Access Denied</div>;
  }

  if (isLoading) {
    return <Loader />;
  }

  if (!category) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Category not found</p>
            <p className="text-xs text-muted-foreground">
              It may have been removed or the link is invalid.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/question-categories")}
            >
              Go to categories
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
          {category.description && (
            <p className="text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{questions.length} questions</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions in this category</CardTitle>
          <CardDescription>
            These questions are currently assigned to
            <span className="font-medium"> {category.name}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <HelpCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No questions are assigned to this category yet.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/admin/question-categories")}
              >
                Manage category questions
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q._id}
                  className="rounded-lg border bg-background px-3 py-3 text-sm shadow-sm"
                >
                  <p className="font-medium leading-snug">{q.questionText}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {q.questionType && (
                      <Badge variant="outline" className="text-[10px]">
                        {q.questionType}
                      </Badge>
                    )}
                    {q.isGlobal && (
                      <Badge variant="secondary" className="text-[10px]">
                        Global
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
