# TaskFlow Website

TaskFlow is a personal productivity website that I built using React.

The main idea of this project is to help users manage daily tasks, reminders, notes, work hours, goals, habits, focus sessions, and analytics in one place. I created this project because many people use separate apps for different things, so I wanted to make one simple website where daily productivity can be managed easily.

This project is mainly built for learning, practice, and showing my frontend development skills.

## About This Project

TaskFlow is a web-based productivity system. It has login and register pages, and after logging in, users can access the main dashboard and different productivity sections.

The website includes:

- Dashboard
- Calendar
- Notes
- Work Hours
- Goals
- Habits
- Focus Timer
- Analytics
- Chatbot Widget

The project stores data in the browser using localStorage. So the saved data stays in the same browser even after refreshing the page.

## Features

## Login and Register

The website has a basic login and register system.

Users can:

- Create an account
- Login with email and password
- Access protected pages after login
- Logout from the website

This login system is only for demo purpose. It is not a real production authentication system.

## Dashboard

The Dashboard gives a quick summary of the user's day.

It shows:

- Today's tasks
- Today's reminders
- Work hours summary
- Earnings summary
- Quick task creation
- Quick reminder creation

This helps users quickly understand what they need to complete for the day.

## Calendar

The Calendar page helps users manage reminders by date.

Users can:

- Select a date
- Add reminders
- View reminders for selected dates
- Mark reminders as completed
- Delete reminders
- Move between months

This is useful for personal events, meetings, deadlines, birthdays, and daily reminders.

## Notes

The Notes page is used to create and manage personal notes.

Users can:

- Add notes
- Edit notes
- Delete notes
- Search notes
- Mark notes as favorite
- Protect notes with password
- Import notes
- Export notes as JSON

This feature is useful for saving ideas, study points, personal information, and quick notes.

## Work Hours

The Work Hours page helps users track work sessions and earnings.

Users can:

- Add work date
- Add start time and end time
- Add hourly pay
- Calculate total work hours
- Calculate earnings
- Add expenses
- Search work records
- View monthly and yearly summaries

This is useful for part-time jobs, hourly work, freelance work, and personal income tracking.

## Goals

The Goals page helps users create and track personal goals.

Users can:

- Add goal title
- Add goal description
- Set target value
- Choose goal category
- Set target date
- Track goal progress

This is useful for study goals, fitness goals, finance goals, productivity goals, and personal targets.

## Habits

The Habits page helps users build daily habits.

Users can:

- Create habits
- Mark habits as completed
- Track habit streaks
- Delete habits

The habit streak feature helps users stay consistent.

## Focus Timer

The Focus page has a Pomodoro-style focus timer.

It includes:

- Focus timer
- Break timer
- Start option
- Pause option
- Reset option
- Focus session count

This is useful for studying, working, and staying focused without distractions.

## Analytics

The Analytics page gives a simple summary of productivity data.

It shows information like:

- Total tasks
- Completed tasks
- Total notes
- Work sessions
- Goals
- Habit progress
- Productivity overview

This helps users understand their progress.

## Chatbot Widget

The website also has a small chatbot assistant.

The chatbot can help with simple actions like:

- Opening pages
- Adding reminders
- Adding notes
- Adding todos
- Showing help
- Giving productivity suggestions

This is a simple project assistant. It is not a full AI chatbot, but it makes the website more interactive.

## Technologies Used

- React
- Vite
- JavaScript
- CSS
- React Router
- LocalStorage

## Project Structure

This is the basic structure of the project:

    Task-flow-Website
    ├── index.html
    ├── package.json
    └── src
        ├── main.jsx
        ├── App.jsx
        ├── Layout.jsx
        ├── styles.css
        ├── app
        │   ├── AuthContext.jsx
        │   ├── RequireAuth.jsx
        │   ├── RemindersContext.jsx
        │   ├── NotesContext.jsx
        │   ├── HabitsContext.jsx
        │   └── GoalsContext.jsx
        ├── pages
        │   ├── Home.jsx
        │   ├── Calendar.jsx
        │   ├── Notes.jsx
        │   ├── WorkHours.jsx
        │   ├── Goals.jsx
        │   ├── Habits.jsx
        │   ├── Focus.jsx
        │   ├── Analytics.jsx
        │   ├── Login.jsx
        │   └── Register.jsx
        └── components
            ├── Sidebar.jsx
            ├── TopBar.jsx
            └── ChatBotWidget.jsx

## How to Run This Project

First clone the repository:

    git clone https://github.com/araWINd-AR/Task-flow-Website.git

Go inside the project folder:

    cd Task-flow-Website

Install the required packages:

    npm install

Run the project:

    npm run dev

After running the command, open the localhost link shown in the terminal.

Usually it will be:

    http://localhost:5173

## Build Command

To create a production build:

    npm run build

## Deployment

This project can be deployed on platforms like:

- Netlify
- Vercel
- GitHub Pages

For Netlify, the common settings are:

    Build command: npm run build
    Publish directory: dist

## How Data Is Stored

This project stores data in browser localStorage.

That means:

- Data stays saved in the same browser
- Data is not stored in a real database
- If browser storage is cleared, the data will be removed
- This is good for demo and learning purpose

## Important Note

The login system in this project is only for demo purpose.

User data is saved in browser localStorage, so this should not be treated as a secure production authentication system.

For a real project, I would improve it by adding Firebase, Supabase, MongoDB, PostgreSQL, or another backend database.

## What I Learned

While building this project, I learned:

- How to create a React project using Vite
- How to build multiple pages using React Router
- How to create login and protected routes
- How to use Context API for shared data
- How to store and read data using localStorage
- How to build reusable components
- How to design dashboard cards and page layouts
- How to manage tasks, reminders, notes, goals, habits, and work records
- How to connect multiple productivity features inside one web app

## Future Improvements

In the future, I want to improve this project by adding:

- Real authentication system
- Firebase or Supabase database
- Forgot password option
- Cloud backup
- Better mobile responsiveness
- Reminder notifications
- Better analytics charts
- Profile settings page
- Improved chatbot support
- Dark mode and light mode improvements
- Better UI polish across all pages

## Conclusion

TaskFlow Website is a personal productivity web app made to manage daily work in one place.

This project helped me practice React, routing, localStorage, state management, UI design, and frontend project structure. It is not a production-level app yet, but it includes many useful features like tasks, reminders, notes, work hours, goals, habits, focus timer, analytics, and chatbot support.

This project is mainly built for learning, practice, and showing my frontend development skills.

## Repository Link

https://github.com/araWINd-AR/Task-flow-Website
