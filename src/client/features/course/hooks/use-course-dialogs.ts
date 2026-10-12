"use client";
import { useRef, useState } from "react";
import type { CourseProposal } from "../../../webmcp.ts";
import type { ImportProposal } from "../types.ts";

export function useCourseDialogs() {
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const proposalTrigger = useRef<HTMLElement | null>(null);
  const [agentProposal, setAgentProposal] = useState<CourseProposal | null>(
    null,
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  return {
    proposal,
    setProposal,
    proposalTrigger,
    agentProposal,
    setAgentProposal,
    showPrompt,
    setShowPrompt,
    showReview,
    setShowReview,
    showProjects,
    setShowProjects,
  };
}

export type CourseDialogs = ReturnType<typeof useCourseDialogs>;
