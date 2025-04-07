const express = require("express")
const bcrypt = require('bcrypt');
var validator = require('validator');
const app = express()
const connect = require("./database")
const cors = require('cors')
const datamodel = require("./USerSchema.js")
const send = require('./sendemail.js');
const config = require('./config/configuration.js')

app.use(cors());
app.use(express.json())
const hostname = config.SERVER.HOSTNAME;
const port = config.SERVER.PORT;

let accountnum = {};

const OTP = () => {
  return Math.floor(1000 + Math.random() * 900000);
}
const AcountNO = () => {
  return Math.floor(1000 + Math.random() * 900000);
}

let otpgen = null;


app.get('/', (req, res) => {

    datamodel.find({})
        .then((data) => {
            return res.json(data)
        })
        .catch(() => {
            console.log('Data can not find');

        })
})

// Validation function
const validat = (objvalue) => {
  if (objvalue.Password !== objvalue.ConfirmPassword) {
    throw new Error('Password and Confirm Password should be the same');
  } else if (!validator.isEmail(objvalue.Email)) {
    throw new Error('Email is not valid');
  }
};
app.post('/datasave', async (req, res) => {
  const { otp, Email, Name, Password, ConfirmPassword, Age, Amount, AccType } = req.body;

  console.log('Received data:', req.body);

  if (!otp) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'OTP is required' });
  }

  console.log(`Generated OTP: ${otpgen}, Received OTP: ${otp}`);

  if (otp != otpgen) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'OTP is incorrect' });
  }

  try {
    validat({ Email, Password, ConfirmPassword });
    console.log('Validation passed');

    const encryptedPassword = await bcrypt.hash(Password, 10);
    console.log('Encrypted Password:', encryptedPassword);

    const finalobj = new datamodel({
      Email,
      Name,
      Password: encryptedPassword,
      ConfirmPassword: encryptedPassword,
      Age,
      ACcountNO: accountnum, 
      Amount,
      AccType,
    });

    await finalobj.save();
    console.log('Data saved successfully');

    res.status(config.StatusCode.SUCCCESS).json({
      message: 'Data saved successfully',
      accountNumber: accountnum, 
    });
  } catch (err) {
    console.error('Detailed Error:', err.message);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to save data',
      error: err.message,
    });
  }
});


app.post('/emailsend', async (req, res) => {
  const { Email } = req.body;

  if (!Email) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: "Email is required" });
  }

  try {
    const userinfo = await datamodel.findOne({ Email: Email.toLowerCase() });
    if (userinfo) {
      return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'Email already exists' });
    }

    // Generate OTP and Account Number
    otpgen = OTP();
    const accountNumber = AcountNO();
    accountnum = accountNumber; // Store plain value

    console.log(`Generated OTP for ${Email}: ${otpgen}`);
    console.log(`Generated Account Number for ${Email}: ${accountNumber}`);

    // Send email with account number and OTP
    const emailContent = `
      Dear Customer,
      
      Welcome to VS Bank!
      Your account number is: ${accountNumber}.
      Please use the following OTP to confirm your registration: ${otpgen}.
      
      Thank you for choosing us!
      
      Best Regards,
      VS Bank Team
    `;
    send(Email, emailContent);

    res.status(config.StatusCode.SUCCCESS).json({
      message: 'OTP and account number sent successfully',
      otpgen,
      accountNumber,
    });
  } catch (err) {
    console.error(err);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({ message: "An error occurred" });
  }
});



app.post('/login', async (req, res) => {
  let { email, password } = req.body; 
  console.log(req.body);

  try {
  
    console.log(email, 'email');
    let userinfo = await datamodel.findOne({ Email: email.toLowerCase() });

    console.log(userinfo, 'userinfo');

    if (!userinfo) {
      throw new Error('user is not present');
    }

    let passmatch = await bcrypt.compare(password, userinfo.Password);

    if (passmatch) {
      res.status(config.StatusCode.SUCCCESS).json({
        message: 'success',
        data: {
          name: userinfo.Name,
          age: userinfo.Age,
          accountNumber: userinfo.ACcountNO,
          accountType: userinfo.AccType,
          initialAmount: userinfo.Amount,
          email: userinfo.Email,
        }
      });
    } else {
      throw new Error('invalid Details');
    }
  } catch (err) {
    console.error(err);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
});






connect()

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});