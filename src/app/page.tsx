import LandingPage from '@/components/marketing/LandingPage'
import { getLandingContent } from '@/lib/content'

export default function Home() {
  const content = getLandingContent()
  return <LandingPage content={content} />
}