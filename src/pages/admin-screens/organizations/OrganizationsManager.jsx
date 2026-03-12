import { useState, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Popconfirm,
  ConfigProvider,
  Image
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_URL } from '../../../const';
import { isSuperAdmin } from '../../../utils';

const OrganizationsManager = () => {
  const [organizations, setOrganizations] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [file, setFile] = useState(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const initialLoadRef = useRef(false);
  const user = JSON.parse(localStorage.getItem('user') || "{}");
  const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') || [];

  // Updated fetchOrganizations for pagination
  const fetchOrganizations = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/organizations`, {
        params: {
          tenant_id: !isSuperAdmin() ? user?.tenant?.tenant_id : '',
          page,
          page_size: size,
        }
      });
      const orgsData = response?.data?.organizations || [];
      const pagination = response?.data?.pagination || {};
      const dataWithIndex = orgsData.map((org, index) => ({
        ...org,
        tenant: org?.tenant?.['Tenant Name'],
        key: org.id,
        sno: (pagination.page - 1) * (pagination.page_size) + index + 1,
        logo: org.logo_data ? `${org.logo_data}` : null
      }));
      setOrganizations(dataWithIndex);
      setTotal(pagination.total_records);
      setCurrentPage(pagination.page);
      setPageSize(pagination.page_size);
    } catch (error) {
      message.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenants data for modal
  const fetchModalData = async () => {
    setModalLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tenants`);
      setTenants(response?.data?.tenants || []);
    } catch (error) {
      console.error('Failed to fetch modal data:', error);
      message.error('Failed to load modal data. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  // Initial data load effect - runs only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      const loadData = async () => {
        setLoading(true);
        try {
          await fetchOrganizations(1, pageSize);
        } catch (error) {
          message.error('Failed to load organizations data. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [fetchOrganizations, pageSize]);

  const handleSubmit = async (values) => {
    console.log(values,'valusdfdses')
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      console.log(values,'values')
      if (editingId) {
        formData.append('tenant', values.tenant_id);
        formData.append('name', values.organization_name);
        if (values.parent_organization_id) {
          formData.append('parent', values.parent_organization_id);
        } else {
          formData.append('parent', '');
        }
      } else {
        formData.append('tenant_id', values.tenant_id);
        formData.append('organization_name', values.organization_name);
        formData.append('logo', file);
        if (values.parent_organization_id) {
          formData.append('parent_organization_id', values.parent_organization_id);
        }
      }
      

      if (editingId) {
        formData.append('file', file);
        await axios.post(`${API_URL}/organizations/${editingId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        message.success('Organization updated successfully');
      } else {
        await axios.post(`${API_URL}/create_organizations`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        message.success('Organization created successfully');
      }
      
      setIsModalOpen(false);
      form.resetFields();
      setEditingId(null);
      setFile(null);
      await fetchOrganizations(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/organizations/${id}`);
      message.success('Organization deleted successfully');
      await fetchOrganizations(currentPage, pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const canCreate = permissions.includes("organization_Create");
  const canUpdate = permissions.includes("organization_Write");
  const canDelete = permissions.includes("organization_Delete");

  const columns = [
    {
      title: 'S.No',
      dataIndex: 'sno',
      key: 'sno',
      sorter: (a, b) => a.sno - b.sno,
    },
    {
      title: 'Logo',
      dataIndex: 'logo',
      key: 'logo',
      render: (logo) => logo ? (
        <Image 
          src={logo} 
          width={50} 
          height={50} 
          style={{ objectFit: 'contain' }}
          preview={false}
        />
      ) : '-',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'organization_name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Tenant',
      dataIndex: 'tenant',
      key: 'tenant',
      sorter: (a, b) => (a.tenant || '').localeCompare(b.tenant || ''),
    },
    {
      title: 'Parent Organization',
      dataIndex: 'parent_organization_name',
      key: 'parent_organization_name',
      render: (text) => text || '-',
      sorter: (a, b) => (a.parent_organization_name || '').localeCompare(b.parent_organization_name || ''),
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
              onClick={() => {
                setEditingId(record.id);

                form.setFieldsValue({
                  tenant_id:user?.tenant?.tenant_id || record.tenant,
                  organization_name: record.name,
                  parent_organization_id: record.parent_organization_id
                });
                setIsModalOpen(true);
                fetchModalData();
              }}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Are you sure to delete this organization?"
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
              fetchModalData();
            }}
            style={{ marginBottom: '16px' }}
          >
            Add Organization
          </Button>
        )}

        <Table
          columns={columns}
          dataSource={organizations}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
              fetchOrganizations(page, size);
            },
          }}
        />

        {(canCreate || canUpdate) && (
          <Modal
            title={editingId ? 'Edit Organization' : 'Create Organization'}
            open={isModalOpen}
            onCancel={() => {
              setIsModalOpen(false);
              form.resetFields();
              setEditingId(null);
              setFile(null);
            }}
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
                name="tenant_id"
                label="Tenant"
                rules={[{ required: true, message: 'Please select tenant!' }]}
              >
                <Select placeholder="Select tenant" loading={modalLoading}>
                  {tenants.map(tenant => (
                    <Select.Option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="organization_name"
                label="Organization Name"
                rules={[{ required: true, message: 'Please input organization name!' }]}
              >
                <Input placeholder="Enter organization name" />
              </Form.Item>

              <Form.Item
                name="parent_organization_id"
                label="Parent Organization (Optional)"
              >
                <Select placeholder="Select parent organization">
                  <Select.Option value="">None</Select.Option>
                  {organizations
                    .filter(org => !editingId || org.id !== editingId)
                    .map(org => (
                      <Select.Option key={org.id} value={org.id}>
                        {org.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item label="Logo">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setIsModalOpen(false);
                    form.resetFields();
                    setFile(null);
                  }}>
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

export default OrganizationsManager;