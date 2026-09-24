export async function handleImageUpload(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No image file provided in "image" form field.');
      err.code = 'FILE_REQUIRED';
      err.statusCode = 400;
      throw err;
    }

    const publicUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        url: publicUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}
