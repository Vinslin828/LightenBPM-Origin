import { useNavigate } from 'react-router-dom'
import { BackIcon } from '../icons'

export default function BackButton({ href }: { href: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(href)}
      className='p-2 hover:bg-gray-100 rounded-md transition-colors border-stroke'
    >
      <BackIcon />
    </button>
  )
}
