export const en = {
  app: {
    eyebrow: 'REVIEW CHAPTER',
    loadingTitle: 'Loading study session',
    loadingDescription: (label: string) => `Loading data for ${label}...`,
    errorTitle: 'Error',
    loadDataError: 'Unable to load question data',
    chapterSelectLabel: 'Select chapter',
    modeLabel: {
      exam: 'Exam',
      practice: 'Practice',
      mistakes: 'Wrong questions',
      mixedReview: 'Review all'
    },
    modeHint: {
      examReady: 'All questions answered. Click submit to grade.',
      examIncomplete: 'Please answer all questions before submitting.',
      practice: 'Single choice/matching questions are graded instantly. Text questions need to press “Check” first.',
      mixedReview: 'Answer one question each time. Wrong answers are shown one more time.',
      mixedReviewStatus: (answered: number, total: number, remainingInQueue: number) =>
        `Progress: ${answered}/${total}. Remaining in queue: ${remainingInQueue}.`,
      mistakesEmpty: 'No wrong questions to review.',
      mistakes:
        'Only previously wrong questions are shown. Correct answers are removed automatically.'
    },
    status: {
      loadingTitle: 'Loading study mode',
      emptyWrongTitle: 'No wrong questions',
      emptyWrongBody:
        'No wrong questions are currently queued. Switch to Practice or Exam mode to generate data.',
      progressMetaExam: 'Exam progress',
      progressMetaPractice: 'Practice progress',
      progressMetaMixedReview: 'Review progress',
      stats: {
        progress: 'Progress',
        time: 'Time',
        score: 'Score',
        correct: 'Correct'
      },
      submit: {
        submitted: 'Submitted',
        submitLabel: 'Submit',
        practiceModeLabel: 'Practicing',
        mixedReviewSubmit: 'Submit answer'
      },
      buttons: {
        clearAnswers: 'Clear answers',
        clearWrongHistory: 'Clear wrong history'
      },
      questionLabel: 'Question',
      manualImageBadge: 'Has image',
      chapterAllLabel: 'All chapters'
    }
  },
  questionCard: {
    typeLabel: {
      single_choice: 'Single choice',
      text_answer: 'Keyword fill',
      matching_matrix: 'Matching'
    },
    imageAlt: (questionNumber: string | number) => `Question image ${questionNumber}`,
    textAnswerPlaceholder: 'Enter answer...',
    checkButton: 'Check',
    result: {
      correct: 'Your answer is correct.',
      incorrect: 'Your answer is incorrect.',
      answerLabel: 'Correct answer:',
      inlineCorrect: '✅ Correct',
      inlineWrong: '⚠️ Not correct'
    }
  },
  matchingQuestion: {
    header: {
      item: 'Item',
      selectItem: 'Select item',
      result: 'Result'
    },
    optionNotSelected: '-- Not selected --',
    correct: 'Correct',
    wrong: 'Wrong'
  },
  manualImage: {
    title: 'Illustration',
    placeholder: 'Image is not available for this question yet'
  },
  mixedReview: {
    title: 'Review all chapters',
    sessionTitle: 'Review session result',
    noProgress: 'No progress yet. Start the review to generate a queue.',
    resetHint: 'Press “Reset” to start again'
  },
  resultPanel: {
    title: 'Session result',
    resetHint: 'Press “Reset” to start over',
    label: {
      total: 'Total',
      answered: 'Answered',
      score: 'Score',
      time: 'Time'
    },
    resetButton: 'Reset'
  }
} as const
