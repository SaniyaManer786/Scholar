// ===== IMPORTS =====
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ===== PORT (IMPORTANT FOR RENDER) =====
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(cors()); // allow frontend (Vercel) to access backend
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// ===== MONGODB CONNECTION =====
// ⚠️ Use Atlas URL in .env instead of localhost
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ===== SCHEMAS =====
const userSchema = new mongoose.Schema({
  regd_no: String,
  name: String,
  email: String,
  password: String,
  branch: String
});
const User = mongoose.model('users', userSchema);

const scholarshipSchema = new mongoose.Schema({
  scholarship_name: String,
  eligible_gender: String,
  eligible_class: String,
  eligible_caste: String,
  income_criteria: String,
  eligible_stream: String,
  provider_type: String,
  amount_given: String,
  minimum_marks: String,
  for_hosteler: String,
  for_area: String,
  youtube_link: String,
  documents_needed: String,
  start_date: String,
  end_date: String
});
const Scholarship = mongoose.model('scholarships', scholarshipSchema);

// ===== ROUTES =====

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'form.html'));
});

// ===== REGISTER =====
app.post('/post', async (req, res) => {
  try {
    const { regd_no, name, email, password, branch } = req.body;
    const newUser = new User({ regd_no, name, email, password, branch });
    await newUser.save();
    res.redirect(`/success.html?email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Error saving user');
  }
});

// ===== LOGIN =====
app.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name, password });

    if (user) {
      res.redirect(`/profile.html?email=${encodeURIComponent(user.email)}`);
    } else {
      res.send(`<h2>❌ Invalid Name or Password</h2><p><a href="/login.html">Try Again</a></p>`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('⚠️ Server Error');
  }
});

// ===== FETCH SCHOLARSHIPS =====
app.post('/fetch-scholarships', async (req, res) => {
  try {
    const { gender, course_type, caste_category, family_income, marks_12, branch, area_type } = req.body;

    const income = Number(family_income) || 0;
    const marks = Number(marks_12) || 0;

    const allScholarships = await Scholarship.find();

    const filtered = allScholarships.filter(s => {
      const g = (s.eligible_gender || '').toLowerCase();
      const c = (s.eligible_class || '').toLowerCase();
      const caste = (s.eligible_caste || '').toLowerCase();
      const stream = (s.eligible_stream || '').toLowerCase();
      const area = (s.for_area || '').toLowerCase();

      const incomeLimit = parseInt((s.income_criteria || '').replace(/[^\d]/g, '')) || Infinity;
      const marksLimit = parseInt((s.minimum_marks || '').replace(/[^\d]/g, '')) || 0;

      return (
        (g === 'both' || g === gender?.toLowerCase()) &&
        c.includes(course_type?.toLowerCase()) &&
        (caste === 'all' || caste === caste_category?.toLowerCase()) &&
        (stream === 'all streams' || stream.includes(branch?.toLowerCase())) &&
        income <= incomeLimit &&
        marks >= marksLimit &&
        (area === 'all' || area === area_type?.toLowerCase())
      );
    });

    res.json(filtered);

  } catch (err) {
    console.error('❌ Scholarship filter error:', err);
    res.status(500).send('⚠️ Error fetching scholarships');
  }
});

// ===== GET USER =====
app.get("/users/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== UPDATE USER =====
app.put('/update/:email', async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: req.params.email },
      req.body,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('⚠️ User not found');
    }

    res.status(200).send('✅ User updated successfully');

  } catch (err) {
    console.error('❌ Update error:', err);
    res.status(500).send('⚠️ Error updating user');
  }
});

// ===== DELETE USER =====
app.delete('/delete/:email', async (req, res) => {
  try {
    const result = await User.deleteOne({ email: req.params.email });

    if (result.deletedCount === 0) {
      return res.status(404).send('⚠️ User not found');
    }

    res.status(200).send('✅ User deleted successfully');

  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).send('⚠️ Error deleting user');
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});