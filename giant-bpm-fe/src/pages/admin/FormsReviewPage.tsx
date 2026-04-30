import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { useState } from 'react'

interface FormReview {
  id: string
  formId: string
  formName: string
  submittedBy: string
  submittedAt: string
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision'
  reviewedBy?: string
  reviewedAt?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category:
    | 'employee_onboarding'
    | 'leave_request'
    | 'expense_claim'
    | 'equipment_request'
    | 'other'
  comments?: string
  data: Record<string, any>
}

const mockFormReviews: FormReview[] = [
  {
    id: '1',
    formId: 'form_001',
    formName: 'Employee Onboarding Request',
    submittedBy: 'John Smith',
    submittedAt: '2024-01-15T10:30:00Z',
    reviewStatus: 'pending',
    priority: 'high',
    category: 'employee_onboarding',
    data: {
      employeeName: 'Alice Johnson',
      position: 'Senior Developer',
      startDate: '2024-02-01',
      department: 'Engineering',
    },
  },
  {
    id: '2',
    formId: 'form_002',
    formName: 'Leave Request',
    submittedBy: 'Sarah Wilson',
    submittedAt: '2024-01-14T14:20:00Z',
    reviewStatus: 'approved',
    reviewedBy: 'Mike Davis',
    reviewedAt: '2024-01-14T16:45:00Z',
    priority: 'medium',
    category: 'leave_request',
    data: {
      leaveType: 'Vacation',
      startDate: '2024-02-15',
      endDate: '2024-02-22',
      reason: 'Family vacation',
    },
  },
  {
    id: '3',
    formId: 'form_003',
    formName: 'Expense Claim',
    submittedBy: 'David Brown',
    submittedAt: '2024-01-13T09:15:00Z',
    reviewStatus: 'needs_revision',
    reviewedBy: 'Emily Chen',
    reviewedAt: '2024-01-13T11:30:00Z',
    priority: 'low',
    category: 'expense_claim',
    comments: 'Please provide receipt for the hotel expenses',
    data: {
      totalAmount: 1250.0,
      currency: 'USD',
      purpose: 'Business travel',
      receiptsAttached: false,
    },
  },
  {
    id: '4',
    formId: 'form_004',
    formName: 'Equipment Request',
    submittedBy: 'Lisa Martinez',
    submittedAt: '2024-01-12T16:00:00Z',
    reviewStatus: 'rejected',
    reviewedBy: 'Tom Anderson',
    reviewedAt: '2024-01-12T17:30:00Z',
    priority: 'medium',
    category: 'equipment_request',
    comments: 'Budget not available for this quarter',
    data: {
      equipment: 'MacBook Pro M3',
      justification: 'Development work',
      estimatedCost: 2500.0,
    },
  },
  {
    id: '5',
    formId: 'form_005',
    formName: 'Emergency Leave',
    submittedBy: 'Robert Kim',
    submittedAt: '2024-01-15T08:00:00Z',
    reviewStatus: 'pending',
    priority: 'urgent',
    category: 'leave_request',
    data: {
      leaveType: 'Emergency',
      startDate: '2024-01-15',
      endDate: '2024-01-17',
      reason: 'Family emergency',
    },
  },
]

export const FormsReviewPage = () => {
  const { t } = useTranslation()
  const [selectedReview, setSelectedReview] = useState<FormReview | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const getStatusColor = (status: FormReview['reviewStatus']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: FormReview['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Less than 1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  const filteredReviews =
    statusFilter === 'all'
      ? mockFormReviews
      : mockFormReviews.filter(review => review.reviewStatus === statusFilter)

  const handleApprove = (reviewId: string) => {
    // Handle approval logic
    console.log('Approving review:', reviewId)
  }

  const handleReject = (reviewId: string) => {
    // Handle rejection logic
    console.log('Rejecting review:', reviewId)
  }

  const handleRequestRevision = (reviewId: string) => {
    // Handle request revision logic
    console.log('Requesting revision for review:', reviewId)
  }

  return (
    <div className='p-6'>
      <div className='bg-white rounded-lg shadow'>
        {/* Header */}
        <div className='px-6 py-4 border-b border-gray-200'>
          <div className='flex justify-between items-center'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>Forms Review</h1>
              <p className='text-sm text-gray-600 mt-1'>Review and approve submitted forms</p>
            </div>
            <div className='flex space-x-3'>
              <button className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium'>
                Export Report
              </button>
              <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium'>
                Bulk Actions
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className='px-6 py-4 border-b border-gray-200 bg-gray-50'>
          <div className='flex space-x-4'>
            <div className='flex-1'>
              <input
                type='text'
                placeholder='Search by form name or submitter...'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='all'>All Status</option>
              <option value='pending'>Pending</option>
              <option value='approved'>Approved</option>
              <option value='rejected'>Rejected</option>
              <option value='needs_revision'>Needs Revision</option>
            </select>
            <select className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>
              <option value='all'>All Categories</option>
              <option value='employee_onboarding'>Employee Onboarding</option>
              <option value='leave_request'>Leave Request</option>
              <option value='expense_claim'>Expense Claim</option>
              <option value='equipment_request'>Equipment Request</option>
              <option value='other'>Other</option>
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Form & Submitter
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Priority
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Submitted
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Reviewed By
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {filteredReviews.map(review => (
                <tr
                  key={review.id}
                  className={cn(
                    'hover:bg-gray-50 cursor-pointer',
                    selectedReview?.id === review.id && 'bg-blue-50'
                  )}
                  onClick={() => setSelectedReview(review)}
                >
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div>
                      <div className='text-sm font-medium text-gray-900'>{review.formName}</div>
                      <div className='text-sm text-gray-500'>
                        Submitted by {review.submittedBy} • Form ID: {review.formId}
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getStatusColor(review.reviewStatus)
                      )}
                    >
                      {review.reviewStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getPriorityColor(review.priority)
                      )}
                    >
                      {review.priority.charAt(0).toUpperCase() + review.priority.slice(1)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatTimeAgo(review.submittedAt)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {review.reviewedBy || '-'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    {review.reviewStatus === 'pending' ? (
                      <div className='flex justify-end space-x-2'>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleApprove(review.id)
                          }}
                          className='text-green-600 hover:text-green-900'
                        >
                          Approve
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleRequestRevision(review.id)
                          }}
                          className='text-yellow-600 hover:text-yellow-900'
                        >
                          Revise
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleReject(review.id)
                          }}
                          className='text-red-600 hover:text-red-900'
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className='text-gray-400'>
                        {review.reviewStatus === 'approved'
                          ? 'Approved'
                          : review.reviewStatus === 'rejected'
                            ? 'Rejected'
                            : 'Revised'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Review Details Panel */}
        {selectedReview && (
          <div className='px-6 py-4 border-t border-gray-200 bg-gray-50'>
            <div className='flex justify-between items-start'>
              <div className='flex-1'>
                <div className='flex items-center space-x-3 mb-4'>
                  <h3 className='text-lg font-medium text-gray-900'>{selectedReview.formName}</h3>
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                      getStatusColor(selectedReview.reviewStatus)
                    )}
                  >
                    {selectedReview.reviewStatus
                      .replace('_', ' ')
                      .replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                      getPriorityColor(selectedReview.priority)
                    )}
                  >
                    {selectedReview.priority.charAt(0).toUpperCase() +
                      selectedReview.priority.slice(1)}{' '}
                    Priority
                  </span>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                  <div>
                    <h4 className='text-sm font-medium text-gray-900 mb-2'>Submission Details</h4>
                    <dl className='space-y-2'>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Form ID</dt>
                        <dd className='text-sm text-gray-900 font-mono'>{selectedReview.formId}</dd>
                      </div>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Submitted By</dt>
                        <dd className='text-sm text-gray-900'>{selectedReview.submittedBy}</dd>
                      </div>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Submitted At</dt>
                        <dd className='text-sm text-gray-900'>
                          {new Date(selectedReview.submittedAt).toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Category</dt>
                        <dd className='text-sm text-gray-900'>
                          {selectedReview.category
                            .replace('_', ' ')
                            .replace(/\b\w/g, l => l.toUpperCase())}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className='text-sm font-medium text-gray-900 mb-2'>Form Data</h4>
                    <dl className='space-y-2'>
                      {Object.entries(selectedReview.data).map(([key, value]) => (
                        <div key={key}>
                          <dt className='text-xs font-medium text-gray-500'>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </dt>
                          <dd className='text-sm text-gray-900'>
                            {typeof value === 'boolean'
                              ? value
                                ? 'Yes'
                                : 'No'
                              : typeof value === 'number'
                                ? value.toLocaleString()
                                : value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div>
                    <h4 className='text-sm font-medium text-gray-900 mb-2'>Review Information</h4>
                    <dl className='space-y-2'>
                      {selectedReview.reviewedBy && (
                        <>
                          <div>
                            <dt className='text-xs font-medium text-gray-500'>Reviewed By</dt>
                            <dd className='text-sm text-gray-900'>{selectedReview.reviewedBy}</dd>
                          </div>
                          <div>
                            <dt className='text-xs font-medium text-gray-500'>Reviewed At</dt>
                            <dd className='text-sm text-gray-900'>
                              {selectedReview.reviewedAt &&
                                new Date(selectedReview.reviewedAt).toLocaleString()}
                            </dd>
                          </div>
                        </>
                      )}
                      {selectedReview.comments && (
                        <div>
                          <dt className='text-xs font-medium text-gray-500'>Comments</dt>
                          <dd className='text-sm text-gray-900'>{selectedReview.comments}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Action Buttons for Pending Reviews */}
                {selectedReview.reviewStatus === 'pending' && (
                  <div className='mt-4 flex space-x-3'>
                    <button
                      onClick={() => handleApprove(selectedReview.id)}
                      className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium'
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequestRevision(selectedReview.id)}
                      className='bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium'
                    >
                      Request Revision
                    </button>
                    <button
                      onClick={() => handleReject(selectedReview.id)}
                      className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium'
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedReview(null)}
                className='text-gray-400 hover:text-gray-600 ml-4'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
