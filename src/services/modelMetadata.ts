export const modelMetadata = {
  modelName: 'Random Forest Classifier',
  imbalanceHandling: 'Class weighting (balanced)',
  decisionThreshold: 0.65,
  dataset: {
    total: 10_000,
    genuine: 9_500,
    fraud: 500,
    fraudPercentage: 5,
  },
  metrics: [
    { label: 'Precision', value: '77.01%' },
    { label: 'Recall', value: '67.00%' },
    { label: 'F1 Score', value: '71.66%' },
    { label: 'F0.5 Score', value: '74.78%' },
    { label: 'ROC-AUC', value: '99.07%' },
    { label: 'PR-AUC', value: '79.82%' },
  ],
} as const
