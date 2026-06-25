const Contact = require("../models/ChatMessage");

exports.SubmitContactForm = async (req, res) => {
  try {
    const { fullName, email, subject, masseage } = req.body;
    if (!fullName || !email || !massge);
    return res.status(400).json({
      success: false,
      message: "All field are required",
    });

    const contact = await Contact.create({
      guest: fullname,
      guest: email,
      subject,
      source: " contact_form",
      initiatedBy: "user",
      status: "open",
      message: [
        {
          role: "user",
          text: message,
          guestEmail: fullName,
          guestName: email,
          createdAt: new Date(),
        },
      ],
      lastMassage: {
        text: masseage,
        role: "user",
        createdAt: new Date(),
      },
    });
    {
      conversationId: conversation._id;
    }
    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      Contact,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: true,
      message: " unable to create",
    });
  }
};
