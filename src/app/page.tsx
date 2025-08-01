import LandingPage from '@/components/marketing/LandingPage'
import { VisualEditorWrapper } from '@/components/visual-editor/VisualEditorWrapper'

// This metadata would typically come from a CMS or configuration file
const pageMetadata = {
  id: 'home-page',
  title: 'Welcome to LiveGuide',
  description: 'Your AI-powered personal development coach'
}

export default function Home() {
  return (
    <VisualEditorWrapper objectId={pageMetadata.id}>
      <LandingPage />
    </VisualEditorWrapper>
  )
}