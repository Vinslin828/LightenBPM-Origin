import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { useState } from 'react'

interface Permission {
  id: string
  name: string
  description: string
  category: 'user' | 'form' | 'workflow' | 'report' | 'admin'
  action: 'create' | 'read' | 'update' | 'delete' | 'submit' | 'approve'
  resource: string
  rolesUsing: string[]
  isSystemPermission: boolean
}

const mockPermissions: Permission[] = [
  {
    id: '1',
    name: 'user.create',
    description: 'Create new users in the system',
    category: 'user',
    action: 'create',
    resource: 'users',
    rolesUsing: ['Administrator'],
    isSystemPermission: true,
  },
  {
    id: '2',
    name: 'user.read',
    description: 'View user information and profiles',
    category: 'user',
    action: 'read',
    resource: 'users',
    rolesUsing: ['Administrator', 'Form Manager'],
    isSystemPermission: true,
  },
  {
    id: '3',
    name: 'user.update',
    description: 'Modify user information and settings',
    category: 'user',
    action: 'update',
    resource: 'users',
    rolesUsing: ['Administrator'],
    isSystemPermission: true,
  },
  {
    id: '4',
    name: 'user.delete',
    description: 'Delete users from the system',
    category: 'user',
    action: 'delete',
    resource: 'users',
    rolesUsing: ['Administrator'],
    isSystemPermission: true,
  },
  {
    id: '5',
    name: 'form.create',
    description: 'Create new forms and form templates',
    category: 'form',
    action: 'create',
    resource: 'forms',
    rolesUsing: ['Administrator', 'Form Manager'],
    isSystemPermission: false,
  },
  {
    id: '6',
    name: 'form.read',
    description: 'View forms and form data',
    category: 'form',
    action: 'read',
    resource: 'forms',
    rolesUsing: ['Administrator', 'Form Manager', 'Workflow Designer', 'User'],
    isSystemPermission: false,
  },
  {
    id: '7',
    name: 'form.update',
    description: 'Modify existing forms and templates',
    category: 'form',
    action: 'update',
    resource: 'forms',
    rolesUsing: ['Administrator', 'Form Manager'],
    isSystemPermission: false,
  },
  {
    id: '8',
    name: 'form.delete',
    description: 'Delete forms and form templates',
    category: 'form',
    action: 'delete',
    resource: 'forms',
    rolesUsing: ['Administrator', 'Form Manager'],
    isSystemPermission: false,
  },
  {
    id: '9',
    name: 'form.submit',
    description: 'Submit form data and responses',
    category: 'form',
    action: 'submit',
    resource: 'forms',
    rolesUsing: ['User'],
    isSystemPermission: false,
  },
  {
    id: '10',
    name: 'workflow.create',
    description: 'Create new workflows and processes',
    category: 'workflow',
    action: 'create',
    resource: 'workflows',
    rolesUsing: ['Administrator', 'Workflow Designer'],
    isSystemPermission: false,
  },
  {
    id: '11',
    name: 'workflow.read',
    description: 'View workflows and process definitions',
    category: 'workflow',
    action: 'read',
    resource: 'workflows',
    rolesUsing: ['Administrator', 'Workflow Designer'],
    isSystemPermission: false,
  },
  {
    id: '12',
    name: 'workflow.update',
    description: 'Modify existing workflows and processes',
    category: 'workflow',
    action: 'update',
    resource: 'workflows',
    rolesUsing: ['Administrator', 'Workflow Designer'],
    isSystemPermission: false,
  },
  {
    id: '13',
    name: 'workflow.delete',
    description: 'Delete workflows and processes',
    category: 'workflow',
    action: 'delete',
    resource: 'workflows',
    rolesUsing: ['Administrator'],
    isSystemPermission: false,
  },
  {
    id: '14',
    name: 'report.read',
    description: 'View reports and analytics',
    category: 'report',
    action: 'read',
    resource: 'reports',
    rolesUsing: ['Administrator', 'Form Manager'],
    isSystemPermission: false,
  },
]

export const PermissionsPage = () => {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)

  const getCategoryColor = (category: Permission['category']) => {
    switch (category) {
      case 'user':
        return 'bg-blue-100 text-blue-800'
      case 'form':
        return 'bg-green-100 text-green-800'
      case 'workflow':
        return 'bg-purple-100 text-purple-800'
      case 'report':
        return 'bg-yellow-100 text-yellow-800'
      case 'admin':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionColor = (action: Permission['action']) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'read':
        return 'bg-blue-100 text-blue-800'
      case 'update':
        return 'bg-yellow-100 text-yellow-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'submit':
        return 'bg-purple-100 text-purple-800'
      case 'approve':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredPermissions =
    selectedCategory === 'all'
      ? mockPermissions
      : mockPermissions.filter(p => p.category === selectedCategory)

  const categories = ['all', ...Array.from(new Set(mockPermissions.map(p => p.category)))]

  return (
    <div className='p-6'>
      <div className='bg-white rounded-lg shadow'>
        {/* Header */}
        <div className='px-6 py-4 border-b border-gray-200'>
          <div className='flex justify-between items-center'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>Permissions Management</h1>
              <p className='text-sm text-gray-600 mt-1'>
                Manage system permissions and access control
              </p>
            </div>
            <button className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium'>
              Create Permission
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className='px-6 py-4 border-b border-gray-200 bg-gray-50'>
          <div className='flex space-x-1'>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
                {category === 'all' && ` (${mockPermissions.length})`}
                {category !== 'all' &&
                  ` (${mockPermissions.filter(p => p.category === category).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Table */}
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Permission
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Category
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Action
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Resource
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Used by Roles
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Type
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {filteredPermissions.map(permission => (
                <tr
                  key={permission.id}
                  className={cn(
                    'hover:bg-gray-50 cursor-pointer',
                    selectedPermission?.id === permission.id && 'bg-blue-50'
                  )}
                  onClick={() => setSelectedPermission(permission)}
                >
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div>
                      <div className='text-sm font-medium text-gray-900 font-mono'>
                        {permission.name}
                      </div>
                      <div className='text-sm text-gray-500'>{permission.description}</div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getCategoryColor(permission.category)
                      )}
                    >
                      {permission.category}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getActionColor(permission.action)
                      )}
                    >
                      {permission.action}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono'>
                    {permission.resource}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex flex-wrap gap-1'>
                      {permission.rolesUsing.slice(0, 2).map((role, index) => (
                        <span
                          key={index}
                          className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800'
                        >
                          {role}
                        </span>
                      ))}
                      {permission.rolesUsing.length > 2 && (
                        <span className='text-xs text-gray-500'>
                          +{permission.rolesUsing.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        permission.isSystemPermission
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      )}
                    >
                      {permission.isSystemPermission ? 'System' : 'Custom'}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    <div className='flex justify-end space-x-2'>
                      {!permission.isSystemPermission && (
                        <>
                          <button className='text-blue-600 hover:text-blue-900'>Edit</button>
                          <button className='text-red-600 hover:text-red-900'>Delete</button>
                        </>
                      )}
                      {permission.isSystemPermission && (
                        <span className='text-gray-400'>System Protected</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permission Details Panel */}
        {selectedPermission && (
          <div className='px-6 py-4 border-t border-gray-200 bg-gray-50'>
            <div className='flex justify-between items-start'>
              <div className='flex-1'>
                <div className='flex items-center space-x-3 mb-4'>
                  <h3 className='text-lg font-medium text-gray-900 font-mono'>
                    {selectedPermission.name}
                  </h3>
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                      getCategoryColor(selectedPermission.category)
                    )}
                  >
                    {selectedPermission.category}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                      getActionColor(selectedPermission.action)
                    )}
                  >
                    {selectedPermission.action}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                      selectedPermission.isSystemPermission
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    )}
                  >
                    {selectedPermission.isSystemPermission ? 'System' : 'Custom'}
                  </span>
                </div>

                <p className='text-sm text-gray-600 mb-4'>{selectedPermission.description}</p>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <h4 className='text-sm font-medium text-gray-900 mb-2'>Permission Details</h4>
                    <dl className='space-y-2'>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Permission ID</dt>
                        <dd className='text-sm text-gray-900 font-mono'>{selectedPermission.id}</dd>
                      </div>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Resource</dt>
                        <dd className='text-sm text-gray-900 font-mono'>
                          {selectedPermission.resource}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Action Type</dt>
                        <dd className='text-sm text-gray-900'>{selectedPermission.action}</dd>
                      </div>
                      <div>
                        <dt className='text-xs font-medium text-gray-500'>Protection Level</dt>
                        <dd className='text-sm text-gray-900'>
                          {selectedPermission.isSystemPermission
                            ? 'System Protected'
                            : 'User Defined'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className='text-sm font-medium text-gray-900 mb-2'>
                      Used by Roles ({selectedPermission.rolesUsing.length})
                    </h4>
                    <div className='space-y-1'>
                      {selectedPermission.rolesUsing.map((role, index) => (
                        <span
                          key={index}
                          className='inline-block bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded mr-1 mb-1'
                        >
                          {role}
                        </span>
                      ))}
                      {selectedPermission.rolesUsing.length === 0 && (
                        <p className='text-sm text-gray-500'>
                          No roles currently use this permission
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPermission(null)}
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
