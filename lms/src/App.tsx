import {Suspense, lazy} from "react";
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import {AuthProvider} from "./contexts/AuthContext";
import AuthLayout from "./layouts/AuthLayout";
import {RequiredAuthProvider} from "@/contexts/RequiredAuthContext";

const Layout = lazy(() => import("./layouts/Layout"));
const LMSHome = lazy(() => import("./pages/LmsHomePage"));
const CourseCataloguePage = lazy(() => import("./pages/CourseCataloguePage"));
const CourseWorkspacePage = lazy(() => import("./pages/CourseWorkspacePage"));
const CourseCreatePage = lazy(() => import("./pages/CourseWorkspacePage/CourseCreatePage"));
const Post = lazy(() => import("./pages/post"));
const PostDetail = lazy(() => import("./sections/posts/post-detail"));
const Roster = lazy(() => import("./pages/RosterPage"));
const Profile = lazy(() => import("./pages/profile"));
const CreateContent = lazy(() => import("./sections/dashboard/new-content/create-content"));
const Groups = lazy(() => import("./pages/GroupsPage"));
const AIBot = lazy(() => import("./pages/aibot"));
const Settings = lazy(() => import("./pages/settings"));
const Login = lazy(() => import("@/pages/LoginPage"));
const Signup = lazy(() => import("./pages/signup/SignUpView"));
const LinkedinReRouteHandler = lazy(() => import("./pages/rerouteHandler/LinkedinReRouteHandler"));
const SignupSocialMedia = lazy(() => import("./pages/./SignupSocialMedia"));
const GoogleReRouteHandler = lazy(() => import("./pages/rerouteHandler/GoogleReRouteHandler"));
const MicrosoftRerouteHandler = lazy(() => import("./pages/rerouteHandler/MicrosoftReRouteHandler"));
const FacebookReRouteHandler = lazy(() => import("./pages/rerouteHandler/FacebookReRouteHandler"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Suspense>
          <Routes>
            <Route path="/login"
                   element={
                     <AuthLayout>
                       <Login/>
                     </AuthLayout>
                   }
            />
            
            <Route path="/signup"
                   element={
                     <AuthLayout>
                       <Signup/>
                     </AuthLayout>
                   }
            />
            
            <Route path="/signupsocialmedia"
                   element={
                     <AuthLayout>
                       <SignupSocialMedia/>
                     </AuthLayout>
                   }
            />
            
            <Route path="/forgotpassword"
                   element={
                     <AuthLayout>
                       <ForgotPassword/>
                     </AuthLayout>
                   }
            />
            
            <Route path="login/oauth2/code/microsoft"
                   element={
                     <Suspense fallback={<div>Loading...</div>}>
                       <MicrosoftRerouteHandler/>
                     </Suspense>
                   }
            />
            <Route path="login/oauth2/code/google"
                   element={
                     <Suspense fallback={<div>Loading...</div>}>
                       <GoogleReRouteHandler/>
                     </Suspense>
                   }
            />
            <Route path="login/oauth2/code/linkedin"
                   element={
                     <Suspense fallback={<div>Loading...</div>}>
                       <LinkedinReRouteHandler/>
                     </Suspense>
                   }
            />
            <Route path="login/oauth2/code/facebook"
                   element={
                     <Suspense fallback={<div>Loading...</div>}>
                       <FacebookReRouteHandler/>
                     </Suspense>
                   }
            />
            
            <Route path="/" element={<RequiredAuthProvider><Layout/></RequiredAuthProvider>}>
              <Route index element={<LMSHome/>}/>
              <Route path="course" element={<CourseCataloguePage/>}/>
              <Route path="course/:courseId" element={<CourseWorkspacePage/>}/>
              <Route path="post" element={<Post/>}/>
              <Route path="post/:postId" element={<PostDetail/>}/>
              <Route path="roster" element={<Roster/>}/>
              <Route path="roster/:courseId" element={<Roster/>}/>
              <Route path="profile" element={<Profile/>}/>
              <Route path="course/add-content" element={<CourseCreatePage/>}/>
              <Route path="create/:contentType" element={<CreateContent/>}/>
              {/* Group sets belong to a course, so the route carries one.
                  The old /roster/create screen posted to /grouping/* on the
                  retired backend. */}
              <Route path="course/:courseId/groups" element={<Groups/>}/>
              <Route path="aibot" element={<AIBot/>}/>
              <Route path="settings" element={<Settings/>}/>
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
};

export default App;