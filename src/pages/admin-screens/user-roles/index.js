import { useState, useEffect, useRef } from 'react';
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
  Checkbox,
  Row,
  Col,
  Card,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { isSuperAdmin } from '../../../utils';
import { API_URL } from '../../../const';

const PermissionChips = ({ permissions }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {Array.isArray(permissions) && permissions.map((perm, index) => (
        <span 
          key={index}
          style={{
            backgroundColor: '#f0f0f0',
            padding: '2px 8px',
            borderRadius: 16,
            fontSize: 12,
            whiteSpace: 'nowrap'
          }}
        >
          {perm}
        </span>
      ))}
    </div>
  );
};

const UserRoles = () => {
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const initialLoadRef = useRef(false);

  const userPermissions = JSON.parse(localStorage.getItem('permissions') || []);
  const canCreate = userPermissions.includes("roles_Create");
  const canUpdate = userPermissions.includes("roles_Write");
  const canDelete = userPermissions.includes("roles_Delete");
  const user = JSON.parse(localStorage.getItem('user') || "{}");

  const screenPermissions = {
    tenant: ['Read', 'Create', 'Write', 'Delete'],
    organization: ['Read', 'Create', 'Write', 'Delete'],
    users: ['Read', 'Create', 'Write', 'Delete'],
    roles: ['Read', 'Create', 'Write', 'Delete'],
    sessions: ['Read', 'Create', 'Write', 'Delete'],
    home: ['Read'],
    data_analysis: ['Read'],
    visualizations: ['Read'],
    missing_value_treatment: ['Read'],
    ai_models: ['Read'],
    kpi: ['Read'],
  };

  // Updated fetchRoles for pagination
  const fetchRoles = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/roles`, {
        params: {
          o_id: !isSuperAdmin() ? user?.organization?.organization_id : '',
          page,
          page_size: size,
        }
      });
      const rolesData = response.data.roles || [];
      const pagination = response.data.pagination || {};
      const dataWithIndex = rolesData.map((role, index) => ({
        ...role,
        key: role.id,
        sno: (pagination.page ? (pagination.page - 1) * (pagination.page_size || size) : 0) + index + 1,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
      }));
      setRoles(dataWithIndex);
      setTotal(pagination.total_records || dataWithIndex.length);
      setCurrentPage(pagination.page || page);
      setPageSize(pagination.page_size || size);
    } catch (error) {
      message.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  function getPermissionsByRole(superAdmin) {
    const filteredPermissions = { ...screenPermissions };
    if (!superAdmin) {
      delete filteredPermissions.tenant;
    }
    return filteredPermissions;
  }

  // Initial data load effect - runs only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      const loadData = async () => {
        setLoading(true);
        try {
          await fetchRoles(1, pageSize);
        } catch (error) {
          message.error('Failed to load roles data. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [fetchRoles, pageSize]);

  // Update all roles refreshes to use current page/size
  const handleSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      const permissionsArray = Object.entries(values.permissions || {})
        .filter(([_, isChecked]) => isChecked)
        .map(([perm]) => perm);
      const formData = new FormData();
      formData.append('roles', values.name);
      formData.append('organization', user?.organization?.organization_id);
      permissionsArray.forEach((perm) => {
        formData.append('permissions', perm);
      });
      if (editingId) {
        await axios.post(`${API_URL}/modify_role/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success('Role updated successfully');
      } else {
        await axios.post(`${API_URL}/roles`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success('Role created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      await fetchRoles(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/modify_role/${id}`);
      message.success('Role deleted successfully');
      await fetchRoles(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const renderPermissionsCheckboxes = () => {
    const adminColumns = [
      {
        title: 'Module',
        dataIndex: 'name',
        key: 'name',
        render: (text) => (
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {text.split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </div>
        ),
      },
      {
        title: 'Read',
        dataIndex: 'screen',
        key: 'read',
        align: 'center',
        width: '15%',
        render: (screen) => (
          <Form.Item
            name={['permissions', `${screen}_Read`]}
            valuePropName="checked"
            noStyle
          >
            <Checkbox />
          </Form.Item>
        ),
      },
      {
        title: 'Create',
        dataIndex: 'screen',
        key: 'create',
        align: 'center',
        width: '15%',
        render: (screen) => (
          <Form.Item
            name={['permissions', `${screen}_Create`]}
            valuePropName="checked"
            noStyle
          >
            <Checkbox />
          </Form.Item>
        ),
      },
      {
        title: 'Write',
        dataIndex: 'screen',
        key: 'write',
        align: 'center',
        width: '15%',
        render: (screen) => (
          <Form.Item
            name={['permissions', `${screen}_Write`]}
            valuePropName="checked"
            noStyle
          >
            <Checkbox />
          </Form.Item>
        ),
      },
      {
        title: 'Delete',
        dataIndex: 'screen',
        key: 'delete',
        align: 'center',
        width: '15%',
        render: (screen) => (
          <Form.Item
            name={['permissions', `${screen}_Delete`]}
            valuePropName="checked"
            noStyle
          >
            <Checkbox />
          </Form.Item>
        ),
      },
    ];

    const appColumns = [
      {
        title: 'Module',
        dataIndex: 'name',
        key: 'name',
        render: (text) => (
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {text.split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </div>
        ),
      },
      {
        title: 'Access',
        dataIndex: 'screen',
        key: 'access',
        align: 'center',
        width: '20%',
        render: (screen) => (
          <Form.Item
            name={['permissions', `${screen}_Read`]}
            valuePropName="checked"
            noStyle
          >
            <Checkbox />
          </Form.Item>
        ),
      },
    ];

    const adminScreens = (isSuperAdmin() 
      ? ['tenant', 'organization', 'users', 'roles', 'sessions'] 
      : ['organization', 'users', 'roles']
    ).map(screen => ({
      name: screen,
      screen: screen,
      key: screen,
    }));

    const appScreens = [
      { name: 'Home', screen: 'home', key: 'home' },
      { name: 'Data Analysis', screen: 'data_analysis', key: 'data_analysis' },
      { name: 'Visualizations', screen: 'visualizations', key: 'visualizations' },
      { name: 'Missing Value Treatment', screen: 'missing_value_treatment', key: 'missing_value_treatment' },
      { name: 'AI Models', screen: 'ai_models', key: 'ai_models' },
      { name: 'KPI', screen: 'kpi', key: 'kpi' },
    ];

    return (
      <>
        <h4 style={{ marginBottom: 8, fontSize: 16 ,fontWeight:600}}>Admin Screens</h4>
        <p style={{ color: 'rgba(0, 0, 0, 0.45)', marginBottom: 8, fontSize: 12 }}>
          These screens require full permissions management
        </p>
        <Table
          size="small"
          columns={adminColumns}
          dataSource={adminScreens}
          pagination={false}
          bordered
          style={{ marginBottom: 16 }}
        />

        <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 16,fontWeight:600 }}>Application Screens</h4>
        <p style={{ color: 'rgba(0, 0, 0, 0.45)', marginBottom: 8, fontSize: 12 }}>
          These screens only require Read/access permission
        </p>
        <Table
          size="small"
          columns={appColumns}
          dataSource={appScreens}
          pagination={false}
          bordered
        />
      </>
    );
  };

  const columns = [
    {
      title: 'S.No',
      dataIndex: 'sno',
      key: 'sno',
      width: 80,
      sorter: (a, b) => a.sno - b.sno,
    },
    {
      title: 'Role Name',
      dataIndex: 'role',
      key: 'role',
      sorter: (a, b) => a.role.localeCompare(b.role),
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions) => <PermissionChips permissions={permissions} />,
      // Custom sorter for permissions count/length
      sorter: (a, b) => a.permissions.length - b.permissions.length,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingId(record.id);
                const permissionsObject = record.permissions.reduce((acc, perm) => {
                  acc[perm] = true;
                  return acc;
                }, {});
                form.setFieldsValue({
                  name: record.role,
                  permissions: permissionsObject,
                });
                setIsModalOpen(true);
              }}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Are you sure to delete this role?"
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
  ];

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
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
            style={{ marginBottom: '16px' }}
          >
            Add Role
          </Button>
        )}

        <Table
          columns={columns}
          dataSource={roles}
          loading={loading}
          rowKey="id"
          scroll={{ x: true }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
              fetchRoles(page, size);
            },
          }}
        />

        {(canCreate || canUpdate) && (
          <Modal
            title={editingId ? 'Edit Role' : 'Create Role'}
            open={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
              form.resetFields();
              setEditingId(null);
            }}
            footer={null}
            destroyOnClose
            centered
            mask={true}
            maskClosable={false}
            width={800}
            style={{ top: 20 }}
            bodyStyle={{ padding: '24px' }}
          >
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              <Form.Item
                name="name"
                label="Role Name"
                rules={[{ required: true, message: 'Please input role name!' }]}
              >
                <Input placeholder="Enter role name" />
              </Form.Item>

              <Form.Item
                name="permissions"
                label="Permissions"
                rules={[{ required: true, message: 'Please select at least one permission!' }]}
              >
                {renderPermissionsCheckboxes()}
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      setIsModalOpen(false);
                      form.resetFields();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit" loading={submitLoading}>
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

export default UserRoles;