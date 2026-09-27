import {
  submitContactInquiryService,
  listInquiriesAdminService,
  updateInquiryStatusAdminService,
} from '../services/inquiry.service.js';
import { contactInquirySchema, updateInquirySchema } from '../validation/inquiry.schema.js';
import { sendContactFormEmail } from '../services/email.service.js';

export async function submitContactInquiry(req, res, next) {
  try {
    const validated = contactInquirySchema.parse(req.body);
    if (validated.website) {
      return res.status(201).json({
        success: true,
        accepted: true,
        autoReplySent: false,
        data: { id: 'bot-filtered', accepted: true, autoReplySent: false },
      });
    }

    const result = await submitContactInquiryService(validated);

    let autoReplySent = false;
    try {autoReplySent = (await sendContactFormEmail(validated)).autoReplySent;} catch { /* Inquiry remains available to administrators even if email fails. */ }

    res.status(201).json({
      success: true,
      message: 'Inquiry received successfully. Our team will contact you soon.',
      accepted: true,
      autoReplySent,
      data: {
        ...result,
        accepted: true,
        autoReplySent,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listInquiriesAdmin(req, res, next) {
  try {
    const inquiries = await listInquiriesAdminService(req.query);
    res.status(200).json({
      success: true,
      data: inquiries,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateInquiryStatusAdmin(req, res, next) {
  try {
    const validated = updateInquirySchema.parse(req.body);
    const result = await updateInquiryStatusAdminService(req.params.id, validated);
    res.status(200).json({
      success: true,
      message: 'Inquiry updated successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
