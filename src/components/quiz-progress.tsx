type StepResult = "correct" | "incorrect";

export function QuizProgress({
  activeStep,
  completedResults,
}: {
  activeStep: 1 | 2 | 3;
  completedResults?: Partial<Record<1 | 2 | 3, StepResult>>;
}) {
  return (
    <div className="quiz-progress-row">
      {([1, 2, 3] as const).map((step, index) => {
        const result = completedResults?.[step];
        const isActive = activeStep === step;

        let className = "quiz-progress-step";
        if (isActive) className += " is-active";
        else if (result === "correct") className += " is-correct";
        else if (result === "incorrect") className += " is-incorrect";

        return (
          <span key={step} className="quiz-progress-segment">
            <span className={className}>
              {result === "correct" ? "O" : result === "incorrect" ? "X" : step}
            </span>
            {index < 2 && <span className="quiz-progress-line" />}
          </span>
        );
      })}
    </div>
  );
}
