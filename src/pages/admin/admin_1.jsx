// Inside Admin.jsx
import AdminEvents from '../admin/events/EventsDashboard';
import EditorialReview from '../admin/blogs/EditorialReview';
import RejectedArticles from '../admin/blogs/RejectedArticles';
import ManageBlogs from '../admin/blogs/ManageBlogs';
import UserManagement from '../admin/users/UserManagement';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('review');

    const renderContent = () => {
        switch(activeTab) {
            case 'review': return <EditorialReview />;
            case 'rejected': return <RejectedArticles />;
            case 'manage_blogs': return <ManageBlogs />;
            case 'events': return <AdminEvents />;
            case 'users': return <UserManagement />;
            default: return <EditorialReview />;
        }
    };

    return (
        <div className="admin-layout">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="content-area">
                {renderContent()}
            </main>
        </div>
    );
}