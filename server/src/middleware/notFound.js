/** Registered after all route mounts, so anything unmatched lands here. */
export const notFound = (req, res) => {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
};
