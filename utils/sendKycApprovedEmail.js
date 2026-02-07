const sendEmail = require("./sendEmail");
const { kycApprovedTemplate } = require("./kycTemplates");

exports.sendKycApprovedEmail = async ({ email, name }) => {
  await sendEmail({
    to: email,
    subject: "KYC Approved",
    html: kycApprovedTemplate(name),
  });
};
