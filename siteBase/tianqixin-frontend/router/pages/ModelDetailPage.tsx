import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ModelDetailDrawer } from '../../components/ModelDetail/ModelDetail'

export function ModelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">{t('型号ID无效')}</div>
      </div>
    )
  }
  
  return <ModelDetailDrawer modelId={id} />
}
