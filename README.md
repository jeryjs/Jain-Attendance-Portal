# Jain University Attendance Portal

A modern, secure, and intuitive web application for managing student attendance at Jain University. Built with Next.js 15, TypeScript, Firebase, and Tailwind CSS.

## ✨ Features

### 🔐 Security & Authentication
- **Google OAuth Integration**: Secure sign-in restricted to `@jainuniversity.ac.in` domain
- **Role-Based Access Control**: Separate interfaces for students, teachers, and admins
- **Domain Restriction**: Only university email addresses can access the system

### 🎨 Modern UI/UX
- **Cyber Theme**: Sleek white and yellow color scheme with professional styling
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Intuitive Navigation**: Clean, modern interface with smooth animations
- **Unconventional Elements**: Semi-circle designs and modern UI patterns

### 📊 Attendance Management
- **Multi-View Interface**: Table, brick grid, and quick mark views for attendance
- **Smart Session Configuration**: Date picker with session time dropdowns
- **Real-time Updates**: Instant attendance marking with visual feedback
- **Bulk Operations**: Mark all present/absent with confirmation dialogs

### 📈 Analytics & Reporting
- **Comprehensive Reports**: View attendance history and statistics
- **Performance Metrics**: Average attendance percentages and trends
- **Session Management**: Track all taken sessions with detailed analytics
- **Admin Dashboard**: Advanced analytics for administrators

### 👥 User Roles

#### Teachers
- Access to all programs and sections
- Take attendance with multiple view options
- View personal attendance reports
- Quick access to recently used sections

#### Students
- Friendly interface explaining system purpose
- Redirected to university portal for attendance viewing

#### Administrators
- All teacher permissions
- Advanced reporting and analytics
- User management capabilities
- System-wide statistics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Firebase project with Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jeryjs/Jain-Attendance-Portal.git
   cd Jain-Attendance-Portal
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Copy `.env.local` and configure your Firebase credentials:
   ```bash
   cp .env.local .env.local.example
   ```

   Update the following variables in `.env.local`:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Admin Configuration
   NEXT_PUBLIC_OWNER_EMAILS=admin@jainuniversity.ac.in
   NEXT_PUBLIC_OWNER_PASSWORD=your_admin_password
   ```

4. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication with Google provider
   - Configure domain restriction to `@jainuniversity.ac.in`
   - Enable Firestore Database
   - Add your web app and copy the configuration

5. **Firestore Data Structure**
   Create a collection called `students` with documents in this format:
   ```json
   {
     "name": "John Doe",
     "usn": "22BCA001",
     "section": "CSE A"
   }
   ```

6. **Run the development server**
   ```bash
   pnpm dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/
│   ├── attendance/
│   │   ├── page.tsx              # Main attendance page
│   │   └── [section]/
│   │       └── page.tsx          # Section-specific attendance
│   ├── dashboard/
│   │   └── page.tsx              # Teacher dashboard
│   ├── reports/
│   │   └── page.tsx              # Attendance reports
│   ├── globals.css               # Global styles with Tailwind
│   ├── layout.tsx                # Root layout with auth provider
│   └── page.tsx                  # Landing page with auth
├── components/
│   └── ui/                       # Shadcn UI components
├── contexts/
│   └── AuthContext.tsx           # Authentication context
├── lib/
│   ├── firebase.ts               # Firebase configuration
│   ├── types.ts                  # TypeScript type definitions
│   └── utils.ts                  # Utility functions
└── public/
    └── programs.json             # Program and section data
```

## 🎯 Usage

### For Teachers
1. **Sign In**: Use your `@jainuniversity.ac.in` Google account
2. **Select Program**: Choose from available programs (CSE, ME, ECE, etc.)
3. **Pick Section**: Select specific section (CSE A, CSE B, etc.)
4. **Configure Session**: Set date and time slot
5. **Take Attendance**: Use preferred view (table/bricks/quick mark)
6. **View Reports**: Check attendance history and analytics

### For Administrators
1. **Access Admin Panel**: Available in attendance and dashboard pages
2. **View Advanced Reports**: Department-wide analytics
3. **Manage Users**: User administration (future feature)
4. **System Analytics**: Comprehensive system statistics

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Shadcn/ui with Radix UI
- **Authentication**: Firebase Auth with Google OAuth
- **Database**: Cloud Firestore
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: pnpm

## 🔧 Configuration

### Session Times
The system supports these predefined session slots:
- 8.45-9.45 AM
- 9.45-10.45 AM
- 8.45-10.45 AM
- 11 AM-12 PM
- 12-1 PM
- 11 AM-1 PM
- 2-2.50 PM
- 2.50-3.40 PM
- 2-3.40 PM

### Date Restrictions
- Cannot select dates beyond current day
- Cannot select dates before August 28, 2025 (system start date)

## 🚀 Deployment

### Vercel (Recommended)
1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Environment Variables**: Add all Firebase and admin configurations
3. **Deploy**: Automatic deployments on push to main branch

### Other Platforms
1. **Build the project**:
   ```bash
   pnpm build
   ```
2. **Start production server**:
   ```bash
   pnpm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the AGPL-3.0-only License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- Jain University for the opportunity to build this system
- Firebase for providing excellent backend services
- Vercel for the amazing deployment platform
- The open-source community for incredible tools and libraries

## 📞 Support

For support or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for common solutions

---

**Built with ❤️ for Jain University**
