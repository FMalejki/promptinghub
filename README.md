# PromptingHub 🚀

A modern, Hugging Face-inspired platform for discovering, sharing, and managing AI prompts. Built with Next.js 14, MongoDB, and TypeScript.

![PromptingHub](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=400&fit=crop)

## ✨ Features

### 🎨 Modern UI/UX
- **Hugging Face-inspired design** - Clean, professional interface
- **Dark mode support** - Automatic theme switching with localStorage persistence
- **Responsive design** - Works perfectly on desktop, tablet, and mobile
- **Beautiful prompt cards** - Large cards with images, categories, and metadata

### 🔐 Authentication & Users
- **Email/Password authentication** via NextAuth.js
- **Google OAuth** integration (optional)
- **User profiles** with avatars and statistics
- **Profile customization** - Edit name and profile picture

### 📝 Prompt Management
- **Create prompts** with rich metadata
- **Private/Public prompts** - Control visibility
- **Share private prompts** with specific users
- **20+ categories** - Writing, Coding, Marketing, Productivity, etc.
- **AI model tracking** - Record which models you've tested prompts on
- **Version notes** - Add specific model versions and testing notes

### ⭐ Social Features
- **Star system** - Like your favorite prompts
- **Favorites collection** - Quick access to starred prompts
- **User profiles** - View other users' public prompts
- **Trending & Recent** - Sort by popularity or recency

### 🤖 AI Model Support
18 pre-configured AI models including:
- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, Codex, DALL-E 3)
- Anthropic (Claude 3 Opus, Sonnet, Haiku, Claude 2)
- Google (Gemini Pro, Gemini Ultra)
- Meta (Llama 2 70B, 13B)
- Mistral AI (Large, Medium)
- Stability AI (Stable Diffusion)
- Midjourney
- Custom models

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Testing**: Jest
- **Deployment**: Vercel

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd promptinghub
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=promptinghub

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-use-openssl-rand-base64-32

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

4. **Generate NextAuth secret**
```bash
openssl rand -base64 32
```

5. **Seed the database** (optional but recommended)
```bash
node scripts/seed.mjs
```

This creates:
- 2 test users (alice@example.com, bob@example.com)
- 13 example prompts with various categories
- Password for both: `password123`

6. **Run development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get connection string
3. Update `MONGODB_URI` in environment variables

## 📁 Project Structure

```
promptinghub/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── prompts/      # Prompt CRUD
│   │   ├── profile/      # User profile
│   │   └── favorites/    # Favorites management
│   ├── components/       # React components
│   │   ├── Navbar.tsx
│   │   └── PromptCard.tsx
│   ├── browse/           # Main browse page
│   ├── prompt/[id]/      # Prompt detail page
│   ├── new/              # Create prompt page
│   ├── user/[email]/     # User profile page
│   ├── settings/         # Account settings
│   ├── favorites/        # Favorites page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── ThemeProvider.tsx # Dark mode context
│   └── Avatar.tsx        # Avatar component
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # MongoDB connection
│   ├── prompts.ts        # Prompt functions
│   ├── users.ts          # User functions
│   └── constants.ts      # Categories & models
├── scripts/
│   └── seed.mjs          # Database seeding
└── __tests__/            # Jest tests
```

## 🎯 Usage

### Creating a Prompt

1. Sign in or create an account
2. Click "New Prompt" in the navbar
3. Fill in:
   - Name and description
   - Category
   - Prompt text (use placeholders like `<TOPIC>`, `<TEXT>`)
   - Optional: Cover image URL
   - Optional: Select tested AI models with versions
   - Optional: Make it private
4. Click "Create Prompt"

### Browsing Prompts

- **Search**: Use the search bar to find prompts
- **Filter**: Click category pills to filter
- **Sort**: Toggle between Recent and Popular
- **View**: Click any card to see full details

### Managing Your Profile

1. Click your avatar → Settings
2. Update display name and profile picture
3. View your prompts at `/user/your-email`

## 🧪 Testing

```bash
npm test
```

## 📝 API Endpoints

### Prompts
- `GET /api/prompts` - List prompts (with filters)
- `POST /api/prompts` - Create prompt
- `GET /api/prompts/[id]` - Get prompt details
- `POST /api/prompts/[id]/star` - Toggle star

### User
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile
- `POST /api/register` - Register new user

### Favorites
- `GET /api/favorites` - Get user's starred prompts

## 🎨 Customization

### Adding New Categories

Edit `lib/constants.ts`:
```typescript
export const PROMPT_CATEGORIES = [
  "Your Category",
  // ... existing categories
] as const;
```

### Adding New AI Models

Edit `lib/constants.ts`:
```typescript
export const AI_MODELS = [
  { id: "model-id", name: "Model Name", provider: "Provider" },
  // ... existing models
] as const;
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Design inspired by [Hugging Face](https://huggingface.co)
- Icons from [Heroicons](https://heroicons.com)
- Images from [Unsplash](https://unsplash.com)

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and MongoDB