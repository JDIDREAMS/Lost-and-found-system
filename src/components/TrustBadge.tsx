import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Award, Star, CheckCircle2 } from "lucide-react";
import { api, UserReputation } from "@/lib/api";
import { Badge } from "./ui/badge";

interface TrustBadgeProps {
  userId?: string | null | undefined;
  isStudentVerified?: boolean | undefined;
  reputation?: UserReputation | null | undefined;
  compact?: boolean | undefined;
}

export function TrustBadge({
  userId,
  isStudentVerified,
  reputation: initialReputation,
  compact = false,
}: TrustBadgeProps) {
  const { data: rep } = useQuery({
    queryKey: ["user-reputation", userId],
    enabled: !initialReputation && !!userId,
    queryFn: async () => {
      try {
        const { reputation } = await api.getUserReputation(userId!);
        return reputation;
      } catch {
        return null;
      }
    },
  });

  const reputation = initialReputation || rep;
  const isStudent = Boolean(
    isStudentVerified ?? reputation?.isStudentVerified,
  );

  if (!isStudent && (!reputation || reputation.badges.length === 0)) {
    return null;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5">
        {isStudent && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
            title="Verified Campus Student"
          >
            <ShieldCheck className="size-3" />
            Verified
          </span>
        )}
        {reputation && reputation.successfulReturnsCount >= 2 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
            title={`${reputation.successfulReturnsCount} Successful returns`}
          >
            <Award className="size-3" />
            {reputation.successfulReturnsCount} Returns
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isStudent && (
        <Badge
          variant="outline"
          className="gap-1 border-primary/30 bg-primary/10 text-[10px] font-medium text-primary"
        >
          <ShieldCheck className="size-3 text-primary" /> Verified Student
        </Badge>
      )}

      {reputation?.badges.map((badge) => {
        if (badge.id === "verified_student") return null;

        const isFinder = badge.id === "top_finder";
        const isHelper = badge.id === "frequent_helper";

        return (
          <Badge
            key={badge.id}
            variant="outline"
            title={badge.description}
            className={`gap-1 text-[10px] font-medium ${
              isFinder
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : isHelper
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-primary/20 bg-primary/5 text-primary"
            }`}
          >
            {isFinder ? (
              <Award className="size-3 text-emerald-600" />
            ) : isHelper ? (
              <Star className="size-3 text-amber-600" />
            ) : (
              <CheckCircle2 className="size-3 text-primary" />
            )}
            {badge.label}
          </Badge>
        );
      })}
    </div>
  );
}
