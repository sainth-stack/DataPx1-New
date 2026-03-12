import { FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '25px'
        }}>
          <div style={{
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FaLock style={{
              fontSize: '40px',
              color: '#dc3545'
            }} />
          </div>
        </div>
        
        <h1 style={{
          color: '#343a40',
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '15px'
        }}>
          Access Denied
        </h1>
        
        <p style={{
          color: '#6c757d',
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '30px'
        }}>
          You don't have sufficient permissions to access this page. Please
          contact your administrator or return to the homepage.
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              backgroundColor: 'transparent',
              color: '#495057',
              border: '1px solid #dee2e6',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              fontWeight: '500',
              ':hover': {
                backgroundColor: '#f8f9fa'
              }
            }}
          >
            <MdArrowBack />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '500',
              ':hover': {
                backgroundColor: '#bb2d3b'
              }
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;