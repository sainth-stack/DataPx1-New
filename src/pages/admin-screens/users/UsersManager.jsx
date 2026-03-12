import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Popconfirm,
  ConfigProvider,
  Select,
  Row,
  Col,
  Spin,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { EyeInvisibleOutlined, EyeTwoTone, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { isSuperAdmin } from '../../../utils';
import { API_URL } from '../../../const';

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [autoPassword, setAutoPassword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  // Filters (like sessions)
  const [filterParams, setFilterParams] = useState({
    userId: undefined,
    orgId: undefined,
  });
  // Users dropdown (infinite scroll)
  const [usersSelect, setUsersSelect] = useState([]);
  const [usersSelectLoading, setUsersSelectLoading] = useState(false);
  const [usersSelectHasMore, setUsersSelectHasMore] = useState(true);
  const [usersSelectPage, setUsersSelectPage] = useState(1);
  // Orgs dropdown (infinite scroll)
  const [orgsSelect, setOrgsSelect] = useState([]);
  const [orgsSelectLoading, setOrgsSelectLoading] = useState(false);
  const [orgsSelectHasMore, setOrgsSelectHasMore] = useState(true);
  const [orgsSelectPage, setOrgsSelectPage] = useState(1);

  // Ref to track if initial load is done
  const initialLoadRef = useRef(false);

  // Get permissions for UI rendering (memoized to prevent unnecessary re-renders) 
  const permissions = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('permissions') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Memoized permission checks
  const { canCreate, canUpdate, canDelete } = useMemo(() => ({
    canCreate: permissions.includes("users_Create"),
    canUpdate: permissions.includes("users_Write"),
    canDelete: permissions.includes("users_Delete"),
  }), [permissions]);

  // Fetch only users data (for refresh after operations)
  const fetchUsers = useCallback(async (page = currentPage, size = pageSize) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentIsSuper = isSuperAdmin();

      // If a specific user is selected, try server-side filter first
      const params = {
        page,
        page_size: size,
      };
      if (!currentIsSuper) {
        params.organization_id = currentUser?.organization?.organization_id;
      } else if (filterParams.orgId) {
        params.organization_id = filterParams.orgId;
      } else {
        params.organization_id = '';
      }
      if (filterParams.userId) {
        // backend may or may not support this; harmless if ignored
        params.user_id = filterParams.userId;
      }

      const response = await axios.get(`${API_URL}/users`, { params });

      // Always use response.data.users and response.data.pagination
      const usersData = response?.data?.users || [];
      const pagination = response?.data?.pagination || {};
      const processedUsers = usersData.map((user, index) => ({
        ...user,
        key: user.id,
        sno: (pagination.page - 1) * pagination.page_size + index + 1,
      }));
      // Fallback to local single-user display if userId selected and server didn't filter
      if (filterParams.userId) {
        const matchFromServer = processedUsers.find(u => u.id === filterParams.userId);
        if (matchFromServer) {
          setUsers([matchFromServer]);
          setTotal(1);
          setCurrentPage(1);
          setPageSize(10);
          return;
        }
        // Try to find in usersSelect cache
        const cached = usersSelect.find(u => u.id === filterParams.userId);
        if (cached) {
          const decorated = {
            ...cached,
            key: cached.id,
            sno: 1,
          };
          setUsers([decorated]);
          setTotal(1);
          setCurrentPage(1);
          setPageSize(10);
          return;
        }
        // Else just show server data as-is
      }
      setUsers(processedUsers);
      setTotal(pagination.total_records || processedUsers.length);
      setCurrentPage(pagination.page || page);
      setPageSize(pagination.page_size || size);
    } catch (error) {
      message.error('Failed to refresh users data');
    }
  }, [currentPage, pageSize, filterParams, usersSelect]);

  // Fetch organizations and roles data for modal
  const fetchModalData = useCallback(async () => {
    setModalLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentIsSuper = isSuperAdmin();

      // Only fetch organizations and roles when modal opens
      const [orgResponse, rolesResponse] = await Promise.all([
        axios.get(`${API_URL}/organizations`, {
          params: {
            tenant_id: !currentIsSuper ? currentUser?.tenant?.tenant_id : ''
          }
        }),
        axios.get(`${API_URL}/roles`, {
          params: {
            o_id: !currentIsSuper ? currentUser?.organization?.organization_id : ''
          }
        })
      ]);

      // Process organizations data
      const orgsData = orgResponse?.data?.organizations || [];
      const processedOrgs = orgsData.map((org, index) => ({
        ...org,
        key: org.id,
        sno: index + 1,
      }));
      setOrganizations(processedOrgs);

      // Process roles data
      const rolesData = rolesResponse?.data?.roles || [];
      const processedRoles = rolesData.map((role, index) => ({
        ...role,
        key: role.id,
        sno: index + 1,
      }));
      setRoles(processedRoles);

    } catch (error) {
      console.error('Failed to fetch modal data:', error);
      message.error('Failed to load modal data. Please try again.');
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Fetch users for the user Select (infinite scroll)
  const fetchUsersForSelect = useCallback(async (page = 1, reset = false) => {
    if (usersSelectLoading) return;
    setUsersSelectLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentIsSuper = isSuperAdmin();
      const params = {
        page,
        limit: 50,
      };
      if (!currentIsSuper) {
        params.organization_id = currentUser?.organization?.organization_id;
      } else if (filterParams.orgId) {
        params.organization_id = filterParams.orgId;
      }
      const response = await axios.get(`${API_URL}/users`, { params });
      const usersArray = response?.data?.users || [];
      const newUsers = usersArray.map((u) => ({
        ...u,
        name: u.username,
        email: u.email,
      }));
      if (reset) {
        setUsersSelect(newUsers);
      } else {
        setUsersSelect(prev => [...prev, ...newUsers]);
      }
      const pagination = response?.data?.pagination;
      const hasMore = pagination ? (pagination.page < pagination.total_pages) : (newUsers.length === 50);
      setUsersSelectHasMore(hasMore);
      setUsersSelectPage(page);
    } catch {
      message.error('Failed to load users list');
    } finally {
      setUsersSelectLoading(false);
    }
  }, [usersSelectLoading, filterParams]);

  // Fetch organizations for the org Select (infinite scroll)
  const fetchOrgsForSelect = useCallback(async (page = 1, reset = false) => {
    if (!isSuperAdmin() || orgsSelectLoading) return;
    setOrgsSelectLoading(true);
    try {
      const response = await axios.get(`${API_URL}/organizations`, {
        params: { page, limit: 50 }
      });
      const newOrgs = response?.data?.organizations?.map(org => ({ ...org })) || [];
      if (reset) {
        setOrgsSelect(newOrgs);
      } else {
        setOrgsSelect(prev => [...prev, ...newOrgs]);
      }
      const hasMore = newOrgs.length === 50;
      setOrgsSelectHasMore(hasMore);
      setOrgsSelectPage(page);
    } catch {
      message.error('Failed to load organizations');
    } finally {
      setOrgsSelectLoading(false);
    }
  }, [orgsSelectLoading]);

  // Initial data load effect - runs only once, only fetches users
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      
      const loadData = async () => {
        setLoading(true);
        
        try {
          await fetchUsers(1, pageSize);
        } catch (error) {
          console.error('Failed to fetch users data:', error);
          message.error('Failed to load users data. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [fetchUsers, pageSize]); // Empty dependency array - this effect runs only once

  // Initial load for selects
  useEffect(() => {
    // Run once on mount; avoid depending on callbacks that change during loading
    fetchUsersForSelect(1, true);
    fetchOrgsForSelect(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch table when filters change (org/user)
  useEffect(() => {
    // Reset to first page
    setCurrentPage(1);
    fetchUsers(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams.orgId, filterParams.userId]);

  // Handle form submission
  const handleSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', values.username);
      formData.append('email', values.email);
      formData.append('organization', values.organization);
      formData.append('roles', values.roles.join(','));

      if (editingId) {
        await axios.post(`${API_URL}/users/${editingId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('User updated successfully');
      } else {
        formData.append('password', values.password);
        await axios.post(`${API_URL}/create_user`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('User created successfully');
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      
      // Refresh only users data
      await fetchUsers(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle user deletion
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/users/${id}`);
      message.success('User deleted successfully');
      
      // Refresh only users data
      await fetchUsers(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Delete failed');
    }
  };

  function generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  // Filters handlers
  const handleFilterChange = (name, value) => {
    const normalizedValue = value || undefined;
    if (name === 'orgId') {
      // Single state update to avoid double-triggering effects
      setFilterParams(prev => ({
        ...prev,
        orgId: normalizedValue,
        userId: undefined,
      }));
      setUsersSelect([]);
      setUsersSelectPage(1);
      setUsersSelectHasMore(true);
      fetchUsersForSelect(1, true);
      return;
    }
    setFilterParams(prev => ({
      ...prev,
      [name]: normalizedValue,
    }));
  };

  const handleUsersSelectScroll = (e) => {
    const { target } = e;
    if (target.scrollTop + target.offsetHeight === target.scrollHeight && usersSelectHasMore && !usersSelectLoading) {
      fetchUsersForSelect(usersSelectPage + 1, false);
    }
  };

  const handleOrgsSelectScroll = (e) => {
    const { target } = e;
    if (target.scrollTop + target.offsetHeight === target.scrollHeight && orgsSelectHasMore && !orgsSelectLoading) {
      fetchOrgsForSelect(orgsSelectPage + 1, false);
    }
  };

  const resetFilters = () => {
    setFilterParams({ userId: undefined, orgId: undefined });
    setCurrentPage(1);
    fetchUsers(1, pageSize);
    // Reload dropdowns to default scope
    fetchUsersForSelect(1, true);
    fetchOrgsForSelect(1, true);
  };

  // Memoized table columns
  const columns = useMemo(() => [
    {
      title: 'S.No',
      dataIndex: 'sno',
      key: 'sno',
      sorter: (a, b) => a.sno - b.sno,
      width: 80,
    },
    {
      title: 'Prefered Name',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: 'Organization',
      dataIndex: 'organization',
      key: 'organization',
      render: (org) => {
        // Use organization data directly from user object
        return org?.organization_name || '-';
      },
      sorter: (a, b) => {
        const orgA = a.organization?.organization_name || '';
        const orgB = b.organization?.organization_name || '';
        return orgA.localeCompare(orgB);
      },
    },
    {
      title: 'Roles',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <span>{Array.isArray(role) ? role.join(', ') : role || '-'}</span>
      ),
      sorter: (a, b) => {
        const roleA = Array.isArray(a.role) ? a.role.join(',') : a.role || '';
        const roleB = Array.isArray(b.role) ? b.role.join(',') : b.role || '';
        return roleA.localeCompare(roleB);
      },
      filters: [
        ...Array.from(new Set(users.flatMap(u => 
          Array.isArray(u.role) ? u.role : [u.role || '']
        ))).filter(Boolean).map(role => ({
          text: role,
          value: role,
        })),
      ],
      onFilter: (value, record) => {
        const roles = Array.isArray(record.role) ? record.role : [record.role];
        return roles.includes(value);
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Are you sure to delete this user?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [users, canUpdate, canDelete, form]);

  // Memoized modal handlers
  const handleModalOpen = useCallback(() => {
    setEditingId(null);
    form.resetFields();
    setIsModalOpen(true);
    // Fetch modal data when opening
    fetchModalData();
  }, [form, fetchModalData]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingId(null);
  }, [form]);

  // Handle edit button click
  const handleEditClick = useCallback((record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      username: record.username,
      email: record.email,
      organization: record.organization?.organization_id,
      roles: Array.isArray(record.role) ? record.role : record.role ? [record.role] : [],
    });
    setIsModalOpen(true);
    // Fetch modal data when opening for edit
    fetchModalData();
  }, [form, fetchModalData]);

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            contentBg: '#fff',
            headerBg: '#fff',
            footerBg: '#fff',
          },
        },
      }}
    >
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '16px', padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
          <Row gutter={16}>
            <Col span={isSuperAdmin() ? 8 : 12}>
              <Select
                style={{ width: '100%' }}
                placeholder="Select User"
                allowClear
                showSearch
                value={filterParams.userId || null}
                onChange={(value) => handleFilterChange('userId', value)}
                onPopupScroll={handleUsersSelectScroll}
                loading={usersSelectLoading}
                filterOption={(input, option) => {
                  const label = (option?.label ?? option?.children ?? '');
                  return String(label).toLowerCase().includes(input.toLowerCase());
                }}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    {usersSelectLoading && (
                      <div style={{ textAlign: 'center', padding: '8px' }}>
                        <Spin size="small" />
                      </div>
                    )}
                  </>
                )}
              >
                {usersSelect.map(u => (
                  <Select.Option key={u.id} value={u.id}>
                    {u.username} ({u.email})
                  </Select.Option>
                ))}
              </Select>
            </Col>
            {isSuperAdmin() && (
              <Col span={8}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select Organization"
                  allowClear
                  showSearch
                  value={filterParams.orgId || null}
                  onChange={(value) => handleFilterChange('orgId', value)}
                  onPopupScroll={handleOrgsSelectScroll}
                  loading={orgsSelectLoading}
                  filterOption={(input, option) => {
                    const label = (option?.label ?? option?.children ?? '');
                    return String(label).toLowerCase().includes(input.toLowerCase());
                  }}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {orgsSelectLoading && (
                        <div style={{ textAlign: 'center', padding: '8px' }}>
                          <Spin size="small" />
                        </div>
                      )}
                    </>
                  )}
                >
                  {orgsSelect.map(org => (
                    <Select.Option key={org.id} value={org.id}>{org.name}</Select.Option>
                  ))}
                </Select>
              </Col>
            )}
            <Col span={isSuperAdmin() ? 6 : 10}>
              <Button onClick={resetFilters} style={{ width: '100%' }}>
                Reset
              </Button>
            </Col>
          </Row>
        </div>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleModalOpen}
            style={{ marginBottom: '16px' }}
          >
            Add User
          </Button>
        )}

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            // Removed showQuickJumper for simplicity
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
              fetchUsers(page, size);
            },
          }}
        />

        {(canCreate || canUpdate) && (
          <Modal
            title={editingId ? 'Edit User' : 'Create User'}
            open={isModalOpen}
            onCancel={handleModalClose}
            footer={null}
            destroyOnClose
            centered
            mask={true}
            maskClosable={false}
            width={600}
            style={{ top: 20, zIndex: 99999 }}
            bodyStyle={{ padding: '24px' }}
            loading={modalLoading}
          >
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              <Form.Item
                name="username"
                label="Prefered Name"
                rules={[{ required: true, message: 'Please input username!' }]}
              >
                <Input placeholder="Enter username" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please input email!' },
                  { type: 'email', message: 'Please enter a valid email!' },
                ]}
              >
                <Input placeholder="Enter email" />
              </Form.Item>

              {!editingId && (
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Please input password!' }]}
                >
                  <Input.Password
                    placeholder="Enter password"
                    iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    addonAfter={
                      <Button
                        icon={<ReloadOutlined />}
                        size="small"
                        style={{ borderRadius: 8, background: '#466657', color: '#fff', fontWeight: 600 }}
                        onClick={() => {
                          const pwd = generatePassword();
                          setAutoPassword(pwd);
                          form.setFieldsValue({ password: pwd });
                        }}
                      >
                        Autogenerate
                      </Button>
                    }
                    value={autoPassword}
                    onChange={e => setAutoPassword(e.target.value)}
                    style={{ borderRadius: 12, background: '#fff' }}
                  />
                </Form.Item>
              )}

              <Form.Item
                name="organization"
                label="Organization"
                rules={[{ required: true, message: 'Please select an organization!' }]}
              >
                <Select placeholder="Select organization" loading={modalLoading}>
                  {organizations.map((org) => (
                    <Select.Option key={org.id} value={org.id}>
                      {org.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="roles"
                label="Roles"
                rules={[{ required: true, message: 'Please select at least one role!' }]}
              >
                <Select mode="multiple" placeholder="Select roles" allowClear loading={modalLoading}>
                  {roles.map((role) => (
                    <Select.Option key={role.id} value={role.role}>
                      {role.role}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleModalClose}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitLoading}
                    disabled={submitLoading}
                  >
                    {editingId ? 'Update' : 'Submit'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        )}
      </div>
    </ConfigProvider>
  );
  };
  
export default UsersManager;