const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        service: process.env.SMTP_SERVICE,
       
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const { email, subject, template, data } = options;

    // Load and render the email template using EJS
    const templatePath = path.join(__dirname, '../mail', `${template}`); // No need to add `.ejs`
    const html = await ejs.renderFile(`${templatePath}`, data); // Appending .ejs here

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        html,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;