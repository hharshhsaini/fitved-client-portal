import { Navigate } from "react-router-dom";

// The old single-page Admin view has been replaced by dedicated admin pages
// (Customers, Trainers, Societies). Keep /admin as a redirect for any old links.
export default function Admin() {
  return <Navigate to="/admin/customers" replace />;
}
