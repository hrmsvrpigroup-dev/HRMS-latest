export const runPayrollJob = async () => {
  return {
    executedAt: new Date().toISOString(),
    status: 'noop',
  }
}

