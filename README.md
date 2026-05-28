# TaskFlow iOS App

TaskFlow is a personal productivity iOS app that I made using SwiftUI.

The main idea of this app is to keep daily tasks, reminders, notes, work hours, goals, habits, focus timer, analytics, vault, and settings in one place. I created this project because many people use different apps for different daily needs, so I wanted to build one simple app where everything can be managed together.

This project is mainly made for learning, practice, and showing my iOS development skills.

## About This Project

TaskFlow is a SwiftUI-based iPhone app. It has a login screen first, and after login the user can access the main app with different tabs.

The app includes:

- Dashboard
- Calendar
- Notes
- Work Hours
- Goals
- Habits
- Focus Timer
- Analytics
- Vault
- Settings

Most of the app data is stored locally on the device. Some data is saved as local JSON files, some settings are saved using UserDefaults, and vault data is saved using Keychain.

## Features

## Login and Signup

The app has a basic login and signup flow.

Users can:

- Login with email and password
- Create a new account
- Use a demo forgot password screen
- Use Face ID or Touch ID demo login if the device supports it

This login system is only for demo purpose. It is not a real production authentication system.

## Dashboard

The Dashboard gives a quick view of the user's day.

It shows:

- Today's tasks
- Today's reminders
- Work hours summary
- Earnings summary
- Quick add task option
- Quick add reminder option

The Dashboard is useful because the user can quickly see what needs to be done today.

## Calendar

The Calendar page helps users manage reminders by date.

Users can:

- View a monthly calendar
- Select a date
- Add reminders
- View pending reminders
- View completed reminders
- Mark reminders as done
- Delete reminders

This is useful for events, birthdays, meetings, assignments, and personal reminders.

## Notes

The Notes page is used to create and manage notes.

Users can:

- Create notes
- Search notes
- View notes
- Delete notes
- See notes with different colors

This feature is useful for saving ideas, study points, personal notes, or quick information.

## Work Hours

The Work Hours page helps track work sessions and expenses.

Users can:

- Add work date
- Add start time and end time
- Add hourly pay
- Calculate total hours
- Calculate earnings
- Add expenses
- Search work records
- Filter monthly or yearly records
- See total hours, total earnings, sessions, average daily hours, and expenses

This is useful for part-time work, hourly jobs, freelance work, and personal income tracking.

## Goals

The Goals page helps users set and track personal goals.

Users can:

- Add a goal
- Select a target date
- Set progress using a slider
- View goal progress
- Delete goals

This is useful for study goals, fitness goals, finance goals, and personal targets.

## Habits

The Habits page helps users build daily habits.

Users can:

- Create habits
- Mark habits as done
- Track streak count
- Delete habits

The habit feature helps users stay consistent.

## Focus Timer

The Focus page has a Pomodoro-style focus timer.

It includes:

- 25-minute timer
- Start button
- Pause button
- Reset button

This is useful for studying, working, or staying focused without distractions.

## Analytics

The Analytics page gives a simple summary of the user's app data.

It shows:

- Total tasks
- Completed tasks
- Total notes
- Work hour entries
- Goal count
- Average goal progress
- Habit count
- Best habit streak

This helps the user understand their productivity progress.

## Vault

The Vault page is used to store login details safely.

Users can:

- Unlock the vault using device authentication
- Add login details
- Save title, username, and password
- Copy username or password
- Delete vault items

Vault data is saved using Keychain, which is better than saving passwords in normal local storage.

## Settings

The Settings page includes basic app preferences and account options.

Users can:

- View account information
- Enable or disable biometric login option
- See dark mode option
- Logout from the app

Note: The dark mode option currently needs improvement because the app is mostly designed with a dark UI.

## Technologies Used

- Swift
- SwiftUI
- Xcode
- Combine
- UserDefaults
- FileManager
- Codable
- LocalAuthentication
- Security / Keychain

## Project Structure

This is the basic structure of the project:

    Task-flow-App-for-Iphones
    ├── README.md
    ├── Task flow code
    │   ├── Task_FlowApp.swift
    │   ├── RootView.swift
    │   ├── MainTabView.swift
    │   ├── AuthView.swift
    │   ├── AuthStore.swift
    │   ├── AppStore.swift
    │   ├── Models.swift
    │   ├── Persistence.swift
    │   ├── DashboardView.swift
    │   ├── CalendarView.swift
    │   ├── NotesView.swift
    │   ├── WorkHoursView.swift
    │   ├── GoalsView.swift
    │   ├── HabitsView.swift
    │   ├── FocusView.swift
    │   ├── AnalyticsView.swift
    │   ├── VaultView.swift
    │   ├── KeychainVault.swift
    │   ├── LocalAuthGate.swift
    │   ├── SettingsView.swift
    │   └── ContentView.swift
    │
    └── Project documents and wireframes

## How to Run This Project

First clone the repository:

    git clone https://github.com/araWINd-AR/Task-flow-App-for-Iphones.git

Open the project in Xcode.

If the Xcode project file is already available, open it directly.

If only Swift files are available, create a new iOS SwiftUI project in Xcode and add the Swift files from the `Task flow code` folder.

Then run the app using an iPhone simulator or a real iPhone.

## Data Storage

This app stores data locally.

The app uses:

- JSON files for tasks, reminders, notes, goals, habits, and some app data
- UserDefaults for demo login/session/settings
- Keychain for vault items
- LocalAuthentication for Face ID, Touch ID, or passcode-based unlock

## Important Note

This app is not using a real backend database yet.

The login and signup system is only for demo purpose. It should not be treated as secure production authentication.

For a real app, I would improve it by adding Firebase Auth, Firestore, Supabase, or another backend system.

## Current Limitations

Some parts of the app are still demo-level.

Current limitations:

- Login system is local demo authentication
- Dark mode setting needs improvement
- Work Hours data should be connected better with Dashboard and Analytics
- Some screens are more polished than others
- Real notification support can be improved
- Cloud database is not added yet
- The app should include a proper Xcode project file if it is missing

## What I Learned

While working on this project, I learned:

- How to build an iOS app using SwiftUI
- How to use TabView for multiple app sections
- How to manage app state using ObservableObject
- How to pass data using EnvironmentObject
- How to save local data using Codable and JSON files
- How to use UserDefaults for simple local settings
- How to use Keychain for sensitive vault data
- How to use LocalAuthentication for Face ID and Touch ID
- How to design multiple productivity features in one app
- How to structure a larger SwiftUI project

## Future Improvements

In the future, I want to improve this project by adding:

- Firebase Authentication
- Firestore database
- Real forgot password flow
- Local notifications for reminders
- Better dark and light mode support
- Better analytics charts
- Cloud backup
- Profile page
- Better habit streak logic
- Better work hours connection with dashboard
- App icon and launch screen
- More polished UI for all screens

## Conclusion

TaskFlow is a productivity iOS app made to manage daily work in one place.

This project helped me practice SwiftUI, local storage, authentication flow, Keychain storage, and app navigation. It still needs improvements before it can be called a production app, but it already shows many useful features like tasks, reminders, notes, work hours, goals, habits, focus timer, analytics, vault, and settings.

This project is mainly built for learning, practice, and showing my iOS app development skills.

## Repository Link

https://github.com/araWINd-AR/Task-flow-App-for-Iphones
