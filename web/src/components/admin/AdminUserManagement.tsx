import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import Icon from '../common/Icon'
import { authFetch } from '@/utils/authFetch'

interface User {
  id: string
  username: string
  email: string
  display_name?: string | null
  is_admin: boolean
  game_system: string
  created_at: string
  updated_at: string
}

interface ListUsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    display_name: '',
    password: '',
    confirmPassword: '',
    is_admin: false,
    game_system: 'Dungeons & Dragons 5th Edition',
  })

  const currentUser = useAuthStore((state) => state.user)

  useEffect(() => {
    fetchUsers()
  }, [page])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await authFetch(`/api/v1/admin/users?page=${page}&limit=${limit}`)

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: ListUsersResponse = await res.json()
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const res = await authFetch('/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          display_name: formData.display_name || null,
          password: formData.password,
          is_admin: formData.is_admin,
          game_system: formData.game_system,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }

      setSuccess('User created successfully!')
      setShowCreateModal(false)
      resetForm()
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setError('')
    setSuccess('')

    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          display_name: formData.display_name || null,
          is_admin: formData.is_admin,
          game_system: formData.game_system,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update user')
      }

      setSuccess('User updated successfully!')
      setShowEditModal(false)
      setSelectedUser(null)
      resetForm()
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setError('')
    setSuccess('')

    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      setSuccess('User deleted successfully!')
      setShowDeleteModal(false)
      setSelectedUser(null)
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setError('')
    setSuccess('')

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          password: formData.password,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess('Password reset successfully!')
      setShowResetPasswordModal(false)
      setSelectedUser(null)
      resetForm()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      display_name: '',
      password: '',
      confirmPassword: '',
      is_admin: false,
      game_system: 'Dungeons & Dragons 5th Edition',
    })
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      display_name: user.display_name || '',
      password: '',
      confirmPassword: '',
      is_admin: user.is_admin,
      game_system: user.game_system,
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user)
    setFormData({ ...formData, password: '', confirmPassword: '' })
    setShowResetPasswordModal(true)
  }

  const totalPages = Math.ceil(total / limit)

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-muted">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">User Management</h1>
          <p className="text-text-muted">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="AlertCircle" className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icon name="Check" className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Users Table */}
      <section className="bg-background-panel border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-muted border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text uppercase tracking-wider">
                  Game System
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-text uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-background-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {(user.display_name || user.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text">
                          {user.display_name || user.username}
                        </span>
                        {user.display_name && (
                          <span className="text-xs text-text-muted">@{user.username}</span>
                        )}
                      </div>
                      {user.id === currentUser?.id && (
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">{user.email}</td>
                  <td className="px-6 py-4">
                    {user.is_admin ? (
                      <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 font-medium">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400 font-medium">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">{user.game_system}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 hover:bg-background rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Icon name="Edit" className="w-4 h-4 text-text-muted hover:text-primary" />
                      </button>
                      <button
                        onClick={() => openResetPasswordModal(user)}
                        className="p-2 hover:bg-background rounded-lg transition-colors"
                        title="Reset password"
                      >
                        <Icon name="Edit" className="w-4 h-4 text-text-muted hover:text-primary" />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-2 hover:bg-background rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Icon
                            name="Trash2"
                            className="w-4 h-4 text-text-muted hover:text-red-500"
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-background-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-background-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-panel border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-text mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Friendly name shown in UI"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  If not set, username will be displayed
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Game System</label>
                <select
                  value={formData.game_system}
                  onChange={(e) => setFormData({ ...formData, game_system: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Dungeons & Dragons 5th Edition</option>
                  <option>Pathfinder 2nd Edition</option>
                  <option>Call of Cthulhu 7th Edition</option>
                  <option>Shadowrun 5th Edition</option>
                  <option>Starfinder</option>
                  <option>Cyberpunk RED</option>
                  <option>Vampire: The Masquerade 5th Edition</option>
                  <option>Savage Worlds</option>
                  <option>FATE Core</option>
                  <option>OSR (Old School Renaissance)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                />
                <label htmlFor="is_admin" className="text-sm font-medium text-text">
                  Admin privileges
                </label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-background border border-border hover:bg-background-muted text-text rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-panel border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-text mb-4">Edit User</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Friendly name shown in UI"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  If not set, username will be displayed
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Game System</label>
                <select
                  value={formData.game_system}
                  onChange={(e) => setFormData({ ...formData, game_system: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Dungeons & Dragons 5th Edition</option>
                  <option>Pathfinder 2nd Edition</option>
                  <option>Call of Cthulhu 7th Edition</option>
                  <option>Shadowrun 5th Edition</option>
                  <option>Starfinder</option>
                  <option>Cyberpunk RED</option>
                  <option>Vampire: The Masquerade 5th Edition</option>
                  <option>Savage Worlds</option>
                  <option>FATE Core</option>
                  <option>OSR (Old School Renaissance)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_admin"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                />
                <label htmlFor="edit_is_admin" className="text-sm font-medium text-text">
                  Admin privileges
                </label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-background border border-border hover:bg-background-muted text-text rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-panel border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Icon name="AlertCircle" className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text mb-2">Delete User</h2>
                <p className="text-sm text-text-muted">
                  Are you sure you want to delete <strong>{selectedUser.username}</strong>? This
                  action cannot be undone and will delete all of their campaigns and content.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedUser(null)
                }}
                className="flex-1 px-4 py-2 bg-background border border-border hover:bg-background-muted text-text rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-panel border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-text mb-4">Reset Password</h2>
            <p className="text-sm text-text-muted mb-4">
              Set a new password for <strong>{selectedUser.username}</strong>
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">New Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false)
                    setSelectedUser(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-background border border-border hover:bg-background-muted text-text rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
