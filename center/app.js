// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDqVE8x9xKx9xKx9xKx9xKx9xKx9xKx9xK",
    authDomain: "altamayoz-d343a.firebaseapp.com",
    projectId: "altamayoz-d343a",
    storageBucket: "altamayoz-d343a.firebasestorage.app",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnopqrstuv"
};

// Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.log('Multiple tabs open');
            } else if (err.code == 'unimplemented') {
                console.log('Browser does not support persistence');
            }
        });
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('خطأ في الاتصال بقاعدة البيانات. تأكد من إعدادات Firebase.');
}

// Global State
let currentGrade = null;
let currentSubject = null;
let currentTeacher = null;
let currentGroup = null;
let currentStudent = null;
let navigationStack = [];

// Get current month
function getCurrentMonth() {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[new Date().getMonth()];
}

// تم إزالة المواد الافتراضية - يجب إضافة المواد يدوياً

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    navigationStack.push(pageId);
}

function goBack() {
    navigationStack.pop();
    const previousPage = navigationStack[navigationStack.length - 1] || 'home-page';
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(previousPage).classList.add('active');
}

// 1. اختيار السنة
function selectGrade(gradeId, gradeName) {
    currentGrade = { id: gradeId, name: gradeName };
    document.getElementById('grade-title').textContent = gradeName;
    
    loadSubjectsFromFirebase();
    showPage('subjects-page');
}

// 2. اختيار المادة
function selectSubject(subjectId, subjectName) {
    currentSubject = subjectName;
    document.getElementById('subject-title').textContent = subjectName;
    document.getElementById('subject-grade').textContent = currentGrade.name;
    
    loadTeachers();
    showPage('teachers-page');
}

// Load subjects from Firebase
function loadSubjectsFromFirebase() {
    const container = document.getElementById('subjects-container');
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">جاري التحميل...</div>';
    
    db.collection('subjects')
        .where('gradeId', '==', currentGrade.id)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <div class="empty-state-text">لا يوجد مواد بعد</div>
                    </div>
                `;
                return;
            }
            
            // Show subjects from Firebase
            snapshot.forEach(doc => {
                const subject = doc.data();
                const wrapper = document.createElement('div');
                wrapper.className = 'subject-wrapper';
                wrapper.innerHTML = `
                    <button class="subject-btn" onclick="selectSubject('${doc.id}', '${subject.name}')">
                        <span class="subject-icon">📚</span>
                        <span class="subject-name">${subject.name}</span>
                    </button>
                    <button class="subject-delete-btn" onclick="deleteSubject('${doc.id}', event)">🗑</button>
                `;
                container.appendChild(wrapper);
            });
        })
        .catch(error => {
            console.error('Error loading subjects:', error);
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#f44336;">حدث خطأ في التحميل</div>';
        });
}

function deleteSubject(subjectId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه المادة؟\nسيتم حذف جميع المدرسين والمجموعات المرتبطة بها.')) {
        db.collection('subjects').doc(subjectId).delete().then(() => {
            loadSubjectsFromFirebase();
            alert('تم حذف المادة بنجاح ✓');
        }).catch(error => {
            console.error('Error deleting subject:', error);
            alert('حدث خطأ في الحذف: ' + error.message);
        });
    }
}

// 3. تحميل المدرسين
function loadTeachers() {
    const container = document.getElementById('teachers-container');
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    if (!db) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">خطأ في الاتصال بقاعدة البيانات</div></div>';
        return;
    }
    
    db.collection('teachers')
        .where('gradeId', '==', currentGrade.id)
        .where('subject', '==', currentSubject)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👨‍🏫</div>
                        <div class="empty-state-text">لا يوجد مدرسين بعد</div>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(doc => {
                const teacher = doc.data();
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div class="item-icon blue">👨‍🏫</div>
                    <div class="item-content" onclick="selectTeacher('${doc.id}', '${teacher.name}')">
                        <div class="item-title">${teacher.name}</div>
                        <div class="item-subtitle">مدرس ${currentSubject}</div>
                        ${teacher.price ? `<div class="item-price">${teacher.price} ج.م/شهر</div>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon edit" onclick="editTeacher('${doc.id}', event)">✏️</button>
                        <button class="btn-icon delete" onclick="deleteTeacher('${doc.id}', event)">🗑</button>
                    </div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading teachers:', error);
            container.innerHTML = `<div class="empty-state"><div class="empty-state-text">خطأ: ${error.message}</div></div>`;
        });
}

// 4. اختيار مدرس
function selectTeacher(teacherId, teacherName) {
    currentTeacher = { id: teacherId, name: teacherName };
    document.getElementById('teacher-name').textContent = teacherName;
    document.getElementById('teacher-subject').textContent = `${currentSubject} - ${currentGrade.name}`;
    
    loadGroups();
    showPage('groups-page');
}

// 5. تحميل المجموعات
function loadGroups() {
    const container = document.getElementById('groups-container');
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    db.collection('groups')
        .where('teacherId', '==', currentTeacher.id)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🕒</div>
                        <div class="empty-state-text">لا يوجد مجموعات بعد</div>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach(doc => {
                const group = doc.data();
                const item = document.createElement('div');
                item.className = 'list-item';
                
                // Handle both old format (single day) and new format (multiple days)
                const displayTitle = group.daysString || group.day || 'مجموعة';
                const displaySubtitle = group.timesString || group.time || '';
                
                item.innerHTML = `
                    <div class="item-icon purple">🕒</div>
                    <div class="item-content" onclick="selectGroup('${doc.id}', '${displayTitle}', '${displaySubtitle}')">
                        <div class="item-title">${displayTitle}</div>
                        <div class="item-subtitle">${displaySubtitle}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon delete" onclick="deleteGroup('${doc.id}', event)">🗑</button>
                    </div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading groups:', error);
            container.innerHTML = '<div class="empty-state"><div class="empty-state-text">حدث خطأ في التحميل</div></div>';
        });
}

// 6. اختيار مجموعة
function selectGroup(groupId, day, time) {
    currentGroup = { id: groupId, day: day, time: time };
    document.getElementById('group-time').textContent = time || day;
    document.getElementById('group-teacher').textContent = `${currentTeacher.name} - ${currentSubject}`;
    
    // Get teacher phone if not already loaded
    if (!currentTeacher.phone) {
        db.collection('teachers').doc(currentTeacher.id).get().then(doc => {
            if (doc.exists) {
                currentTeacher.phone = doc.data().phone;
            }
        });
    }
    
    loadStudents();
    showPage('students-page');
}

// 7. تحميل الطلاب
let allStudentsData = []; // Store all students for search

function loadStudents(searchQuery = '') {
    const container = document.getElementById('students-container');
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    
    db.collection('students')
        .where('groupId', '==', currentGroup.id)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-text">لا يوجد طلاب بعد</div>
                    </div>
                `;
                allStudentsData = [];
                return;
            }
            
            // Store all students
            allStudentsData = [];
            snapshot.forEach(doc => {
                allStudentsData.push({
                    id: doc.id,
                    data: doc.data()
                });
            });
            
            // Filter students based on search query
            const filteredStudents = searchQuery 
                ? allStudentsData.filter(student => 
                    student.data.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : allStudentsData;
            
            if (filteredStudents.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <div class="empty-state-text">لا توجد نتائج للبحث</div>
                    </div>
                `;
                return;
            }
            
            filteredStudents.forEach(studentObj => {
                const student = studentObj.data;
                const currentMonth = getCurrentMonth();
                const isPaid = student.lastPaymentMonth === currentMonth;
                
                const item = document.createElement('div');
                item.className = 'student-item';
                item.innerHTML = `
                    <div class="student-header" onclick="selectStudent('${studentObj.id}')">
                        <div class="item-icon green">👤</div>
                        <div class="item-content">
                            <div class="item-title">${student.name}</div>
                            ${student.phone ? `<div class="item-subtitle">📱 ${student.phone}</div>` : ''}
                            ${isPaid ? '<span class="badge-green">مدفوع</span>' : '<span class="badge-red">لم يدفع</span>'}
                            ${student.lastAttendanceDate ? `<div class="attendance-date">آخر حضور: ${student.lastAttendanceDate}</div>` : ''}
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="attendance-btn ${student.present === true ? 'present' : student.present === false ? 'absent' : 'neutral'}" 
                                onclick="markAttendance('${studentObj.id}', true, event)">
                            ✓ حاضر
                        </button>
                        <button class="attendance-btn ${student.present === false ? 'absent' : student.present === true ? 'present' : 'neutral'}" 
                                onclick="markAttendance('${studentObj.id}', false, event)">
                            ✗ غائب
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading students:', error);
            container.innerHTML = '<div class="empty-state"><div class="empty-state-text">حدث خطأ في التحميل</div></div>';
        });
}

// 8. تحديد الحضور
function markAttendance(studentId, isPresent, event) {
    event.stopPropagation();
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    
    db.collection('students').doc(studentId).update({
        present: isPresent,
        lastAttendanceDate: dateStr,
        lastAttendanceTimestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // Record in attendance history
        db.collection('attendance').add({
            studentId: studentId,
            present: isPresent,
            date: dateStr,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update absences count
        if (!isPresent) {
            db.collection('students').doc(studentId).get().then(doc => {
                const absences = (doc.data().absences || 0) + 1;
                db.collection('students').doc(studentId).update({ absences: absences });
            });
        }
        
        loadStudents();
    }).catch(error => {
        console.error('Error marking attendance:', error);
        alert('حدث خطأ في تسجيل الحضور');
    });
}

// 9. اختيار طالب
function selectStudent(studentId) {
    db.collection('students').doc(studentId).get().then(doc => {
        if (doc.exists) {
            const student = doc.data();
            currentStudent = { id: studentId, ...student };
            
            document.getElementById('student-name-title').textContent = student.name;
            document.getElementById('student-group-info').textContent = `${currentGroup.day} - ${currentGroup.time}`;
            document.getElementById('student-phone').textContent = student.phone || 'غير محدد';
            document.getElementById('student-parent').textContent = student.parentPhone || 'غير محدد';
            document.getElementById('student-absences').textContent = student.absences || 0;
            
            // Current month and payment status
            const currentMonth = getCurrentMonth();
            document.getElementById('current-month').textContent = currentMonth;
            document.getElementById('last-payment-month').textContent = student.lastPaymentMonth || 'لم يدفع بعد';
            
            const paymentStatus = document.getElementById('student-payment');
            if (student.lastPaymentMonth === currentMonth) {
                paymentStatus.textContent = 'مدفوع';
                paymentStatus.className = 'value badge-green';
            } else {
                paymentStatus.textContent = 'لم يدفع';
                paymentStatus.className = 'value badge-red';
            }
            
            loadGrades(studentId);
            showPage('student-page');
        }
    });
}

// 10. تحميل الدرجات
function loadGrades(studentId) {
    const container = document.getElementById('grades-list');
    container.innerHTML = '<div style="text-align:center;color:#666;">جاري التحميل...</div>';
    
    db.collection('grades')
        .where('studentId', '==', studentId)
        .get()
        .then(snapshot => {
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align:center;color:#666;">لا توجد درجات بعد</div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const grade = doc.data();
                const item = document.createElement('div');
                item.className = 'grade-item';
                item.innerHTML = `
                    <div class="grade-name">${grade.examName}</div>
                    <div class="grade-score">${grade.score}/${grade.total}</div>
                `;
                container.appendChild(item);
            });
        });
}

// Modals
function showAddTeacherModal() {
    document.getElementById('add-teacher-modal').classList.add('active');
}

function showAddGroupModal() {
    document.getElementById('add-group-modal').classList.add('active');
}

function showAddStudentModal() {
    document.getElementById('add-student-modal').classList.add('active');
}

function showAddGradeModal() {
    document.getElementById('add-grade-modal').classList.add('active');
}

function showAddSubjectModal() {
    document.getElementById('add-subject-modal').classList.add('active');
}

function addNewSubject() {
    const name = document.getElementById('subject-name-input').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم المادة');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    db.collection('subjects').add({
        name: name,
        gradeId: currentGrade.id,
        gradeName: currentGrade.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('subject-name-input').value = '';
        closeModal();
        loadSubjectsFromFirebase();
        alert('تم إضافة المادة بنجاح ✓');
    }).catch(error => {
        console.error('Error adding subject:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
}

// Add Functions
function addTeacher() {
    const name = document.getElementById('teacher-name-input').value.trim();
    const price = document.getElementById('teacher-price-input').value;
    const phone = document.getElementById('teacher-phone-input').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم المدرس');
        return;
    }
    
    if (!phone) {
        alert('من فضلك أدخل رقم هاتف المدرس');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات. تأكد من إعدادات Firebase.');
        return;
    }
    
    db.collection('teachers').add({
        name: name,
        price: price ? parseInt(price) : 0,
        phone: phone,
        gradeId: currentGrade.id,
        gradeName: currentGrade.name,
        subject: currentSubject,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('teacher-name-input').value = '';
        document.getElementById('teacher-price-input').value = '';
        document.getElementById('teacher-phone-input').value = '';
        closeModal();
        loadTeachers();
        alert('تم إضافة المدرس بنجاح ✓');
    }).catch(error => {
        console.error('Error adding teacher:', error);
        alert('حدث خطأ في الإضافة: ' + error.message + '\n\nتأكد من:\n1. تفعيل Firestore في Firebase Console\n2. صحة بيانات Firebase في app.js');
    });
}

function toggleDayTime(checkbox) {
    const day = checkbox.value;
    const timeInput = document.querySelector(`.day-time-input[data-day="${day}"]`);
    const periodSelect = document.querySelector(`.day-period-select[data-day="${day}"]`);
    timeInput.disabled = !checkbox.checked;
    periodSelect.disabled = !checkbox.checked;
    if (!checkbox.checked) {
        timeInput.value = '';
        periodSelect.value = 'ص';
    }
}

function convertTo12Hour(time24, period) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let hour = parseInt(hours);
    
    if (hour === 0) hour = 12;
    else if (hour > 12) hour = hour - 12;
    
    return `${hour}:${minutes} ${period}`;
}

function addGroup() {
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    // Collect selected days and times
    const selectedDays = [];
    document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
        const day = checkbox.value;
        const timeInput = document.querySelector(`.day-time-input[data-day="${day}"]`);
        const periodSelect = document.querySelector(`.day-period-select[data-day="${day}"]`);
        const time24 = timeInput.value;
        const period = periodSelect.value;
        
        if (time24) {
            const time12 = convertTo12Hour(time24, period);
            selectedDays.push({ day: day, time: time12 });
        }
    });
    
    if (selectedDays.length === 0) {
        alert('من فضلك اختر يوم واحد على الأقل مع الموعد');
        return;
    }
    
    // Create ONE group with multiple days
    const daysString = selectedDays.map(d => d.day).join(' - ');
    const timesString = selectedDays.map(d => `${d.day}: ${d.time}`).join(' | ');
    
    db.collection('groups').add({
        teacherId: currentTeacher.id,
        teacherName: currentTeacher.name,
        subject: currentSubject,
        gradeId: currentGrade.id,
        gradeName: currentGrade.name,
        days: selectedDays,
        daysString: daysString,
        timesString: timesString,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // Reset form
        document.querySelectorAll('.day-checkbox input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.day-time-input').forEach(input => {
            input.value = '';
            input.disabled = true;
        });
        document.querySelectorAll('.day-period-select').forEach(select => {
            select.value = 'ص';
            select.disabled = true;
        });
        closeModal();
        loadGroups();
        alert('تم إضافة المجموعة بنجاح ✓');
    }).catch(error => {
        console.error('Error adding group:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

function addStudent() {
    const name = document.getElementById('student-name-input').value.trim();
    const phone = document.getElementById('student-phone-input').value.trim();
    const parentPhone = document.getElementById('student-parent-input').value.trim();
    const notes = document.getElementById('student-notes-input').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم الطالب');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    db.collection('students').add({
        name: name,
        phone: phone,
        parentPhone: parentPhone,
        notes: notes,
        groupId: currentGroup.id,
        teacherId: currentTeacher.id,
        subject: currentSubject,
        gradeId: currentGrade.id,
        paid: false,
        absences: 0,
        present: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('student-name-input').value = '';
        document.getElementById('student-phone-input').value = '';
        document.getElementById('student-parent-input').value = '';
        document.getElementById('student-notes-input').value = '';
        closeModal();
        loadStudents();
        alert('تم إضافة الطالب بنجاح ✓');
    }).catch(error => {
        console.error('Error adding student:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

function addGrade() {
    const examName = document.getElementById('exam-name-input').value.trim();
    const score = document.getElementById('exam-grade-input').value;
    const total = document.getElementById('exam-total-input').value;
    
    if (!examName || !score || !total) {
        alert('من فضلك أكمل جميع البيانات');
        return;
    }
    
    if (!db) {
        alert('خطأ في الاتصال بقاعدة البيانات');
        return;
    }
    
    db.collection('grades').add({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        examName: examName,
        score: parseInt(score),
        total: parseInt(total),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('exam-name-input').value = '';
        document.getElementById('exam-grade-input').value = '';
        document.getElementById('exam-total-input').value = '';
        closeModal();
        loadGrades(currentStudent.id);
        alert('تم إضافة الدرجة بنجاح ✓');
    }).catch(error => {
        console.error('Error adding grade:', error);
        alert('حدث خطأ في الإضافة: ' + error.message);
    });
}

// Edit Functions
let editingTeacherId = null;
let editingStudentId = null;

function editTeacher(teacherId, event) {
    event.stopPropagation();
    editingTeacherId = teacherId;
    
    db.collection('teachers').doc(teacherId).get().then(doc => {
        if (doc.exists) {
            const teacher = doc.data();
            document.getElementById('edit-teacher-name').value = teacher.name;
            document.getElementById('edit-teacher-price').value = teacher.price || '';
            document.getElementById('edit-teacher-phone').value = teacher.phone || '';
            document.getElementById('edit-teacher-modal').classList.add('active');
        }
    });
}

function saveTeacherEdit() {
    const name = document.getElementById('edit-teacher-name').value.trim();
    const price = document.getElementById('edit-teacher-price').value;
    const phone = document.getElementById('edit-teacher-phone').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم المدرس');
        return;
    }
    
    if (!phone) {
        alert('من فضلك أدخل رقم هاتف المدرس');
        return;
    }
    
    db.collection('teachers').doc(editingTeacherId).update({
        name: name,
        price: price ? parseInt(price) : 0,
        phone: phone
    }).then(() => {
        closeModal();
        loadTeachers();
        alert('تم تحديث البيانات بنجاح ✓');
    }).catch(error => {
        console.error('Error updating teacher:', error);
        alert('حدث خطأ في التحديث: ' + error.message);
    });
}

function showEditStudentModal() {
    editingStudentId = currentStudent.id;
    document.getElementById('edit-student-name').value = currentStudent.name;
    document.getElementById('edit-student-phone').value = currentStudent.phone || '';
    document.getElementById('edit-student-parent').value = currentStudent.parentPhone || '';
    document.getElementById('edit-student-notes').value = currentStudent.notes || '';
    document.getElementById('edit-student-modal').classList.add('active');
}

function saveStudentEdit() {
    const name = document.getElementById('edit-student-name').value.trim();
    const phone = document.getElementById('edit-student-phone').value.trim();
    const parentPhone = document.getElementById('edit-student-parent').value.trim();
    const notes = document.getElementById('edit-student-notes').value.trim();
    
    if (!name) {
        alert('من فضلك أدخل اسم الطالب');
        return;
    }
    
    db.collection('students').doc(editingStudentId).update({
        name: name,
        phone: phone,
        parentPhone: parentPhone,
        notes: notes
    }).then(() => {
        closeModal();
        selectStudent(editingStudentId);
        alert('تم تحديث البيانات بنجاح ✓');
    }).catch(error => {
        console.error('Error updating student:', error);
        alert('حدث خطأ في التحديث: ' + error.message);
    });
}

// Delete Functions
function deleteTeacher(teacherId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا المدرس؟')) {
        db.collection('teachers').doc(teacherId).delete().then(() => {
            loadTeachers();
        }).catch(error => {
            console.error('Error deleting teacher:', error);
            alert('حدث خطأ في الحذف');
        });
    }
}

function deleteGroup(groupId, event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
        db.collection('groups').doc(groupId).delete().then(() => {
            loadGroups();
        }).catch(error => {
            console.error('Error deleting group:', error);
            alert('حدث خطأ في الحذف');
        });
    }
}

// Payment Modal
function showPaymentModal() {
    const currentMonth = getCurrentMonth();
    document.getElementById('payment-modal-title').textContent = `تسجيل فلوس شهر ${currentMonth}`;
    document.getElementById('payment-modal').classList.add('active');
}

function recordPayment() {
    const currentMonth = getCurrentMonth();
    
    // Get teacher price
    db.collection('teachers').doc(currentTeacher.id).get().then(teacherDoc => {
        const teacherPrice = teacherDoc.data().price || 0;
        
        return db.collection('students').doc(currentStudent.id).update({
            lastPaymentMonth: currentMonth,
            lastPaymentAmount: teacherPrice,
            lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        // Get teacher price again for payment history
        return db.collection('teachers').doc(currentTeacher.id).get();
    }).then(teacherDoc => {
        const teacherPrice = teacherDoc.data().price || 0;
        
        // Record in payments history
        return db.collection('payments').add({
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            month: currentMonth,
            amount: teacherPrice,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        closeModal();
        selectStudent(currentStudent.id);
        alert('تم تسجيل الدفعة بنجاح ✓');
    }).catch(error => {
        console.error('Error recording payment:', error);
        alert('حدث خطأ في التسجيل: ' + error.message);
    });
}

// WhatsApp - Send to Parent
function sendWhatsAppMessage() {
    if (!currentStudent.parentPhone) {
        alert('لا يوجد رقم لولي الأمر');
        return;
    }
    
    const currentMonth = getCurrentMonth();
    const isPaid = currentStudent.lastPaymentMonth === currentMonth;
    
    const message = `
مرحبا،

نود اعلامكم بحالة الطالب/ة: ${currentStudent.name}

المادة: ${currentSubject}
المدرس: ${currentTeacher.name}
المجموعة: ${currentGroup.day}
عدد الغيابات: ${currentStudent.absences || 0}
حالة الدفع: ${isPaid ? 'مدفوع' : 'لم يدفع'}

مع تحيات مركز التميز التعليمي
    `.trim();
    
    // Format phone number - add 20 if starts with 0
    let phone = currentStudent.parentPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
        phone = '2' + phone;
    } else if (!phone.startsWith('2')) {
        phone = '2' + phone;
    }
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// WhatsApp - Send Statistics to Teacher
function sendTeacherStatistics() {
    if (!currentTeacher || !currentTeacher.phone) {
        alert('لا يوجد رقم هاتف للمدرس');
        return;
    }
    
    // Get all students in this group
    db.collection('students')
        .where('groupId', '==', currentGroup.id)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                alert('لا يوجد طلاب في هذه المجموعة');
                return;
            }
            
            const currentMonth = getCurrentMonth();
            let studentsInfo = [];
            
            snapshot.forEach(doc => {
                const student = doc.data();
                const isPaid = student.lastPaymentMonth === currentMonth;
                
                studentsInfo.push({
                    name: student.name,
                    absences: student.absences || 0,
                    paid: isPaid
                });
            });
            
            // Build message
            let message = `📊 إحصائيات الطلاب\n`;
            message += `👨‍🏫 المدرس: ${currentTeacher.name}\n`;
            message += `📚 المادة: ${currentSubject}\n`;
            message += `🕒 المجموعة: ${currentGroup.day}\n`;
            message += `📅 الشهر: ${currentMonth}\n\n`;
            message += `━━━━━━━━━━━━━━━━\n\n`;
            
            studentsInfo.forEach((student, index) => {
                message += `${index + 1}. ${student.name}\n`;
                message += `   الغيابات: ${student.absences}\n`;
                message += `   الدفع: ${student.paid ? 'مدفوع' : 'لم يدفع'}\n\n`;
            });
            
            message += `━━━━━━━━━━━━━━━━\n`;
            message += `الاجمالي: ${studentsInfo.length} طالب\n`;
            message += `دفعوا: ${studentsInfo.filter(s => s.paid).length}\n`;
            message += `لم يدفعوا: ${studentsInfo.filter(s => !s.paid).length}\n\n`;
            message += `مع تحيات مركز التميز التعليمي`;
            
            // Format phone number - add 20 if starts with 0
            let phone = currentTeacher.phone.replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) {
                phone = '2' + phone;
            } else if (!phone.startsWith('2')) {
                phone = '2' + phone;
            }
            
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        })
        .catch(error => {
            console.error('Error getting students:', error);
            alert('حدث خطأ في جمع البيانات');
        });
}

// Search Functions
document.addEventListener('DOMContentLoaded', () => {
    // Global search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) {
                document.getElementById('global-search-results').innerHTML = '';
                return;
            }
            performGlobalSearch(query);
        });
    }
    
    // Subject search
    const subjectSearch = document.getElementById('subject-search');
    if (subjectSearch) {
        subjectSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length < 2) {
                document.getElementById('subject-search-results').innerHTML = '';
                return;
            }
            performSubjectSearch(query);
        });
    }
    
    // Students search (in group)
    const studentsSearch = document.getElementById('students-search');
    if (studentsSearch) {
        studentsSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            loadStudents(query);
        });
    }
});

function performGlobalSearch(query) {
    const resultsContainer = document.getElementById('global-search-results');
    resultsContainer.innerHTML = '<div style="text-align:center;padding:10px;color:#666;">جاري البحث...</div>';
    
    const results = [];
    
    // Search students
    db.collection('students').get().then(snapshot => {
        snapshot.forEach(doc => {
            const student = doc.data();
            if (student.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'student',
                    id: doc.id,
                    name: student.name,
                    details: `${student.subject} - ${student.gradeName}`,
                    icon: '👤',
                    data: student
                });
            }
        });
        
        // Search teachers
        return db.collection('teachers').get();
    }).then(snapshot => {
        snapshot.forEach(doc => {
            const teacher = doc.data();
            if (teacher.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'teacher',
                    id: doc.id,
                    name: teacher.name,
                    details: `${teacher.subject} - ${teacher.gradeName}`,
                    icon: '👨‍🏫',
                    data: teacher
                });
            }
        });
        
        // Search subjects
        return db.collection('subjects').get();
    }).then(snapshot => {
        snapshot.forEach(doc => {
            const subject = doc.data();
            if (subject.name.toLowerCase().includes(query)) {
                results.push({
                    type: 'subject',
                    id: doc.id,
                    name: subject.name,
                    details: subject.gradeName,
                    icon: '📚',
                    data: subject
                });
            }
        });
        
        displaySearchResults(results, resultsContainer, 'global');
    }).catch(error => {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div style="text-align:center;padding:10px;color:#f44336;">حدث خطأ في البحث</div>';
    });
}

function performSubjectSearch(query) {
    if (!currentGrade || !currentSubject) return;
    
    const resultsContainer = document.getElementById('subject-search-results');
    resultsContainer.innerHTML = '<div style="text-align:center;padding:10px;color:#666;">جاري البحث...</div>';
    
    db.collection('students')
        .where('gradeId', '==', currentGrade.id)
        .where('subject', '==', currentSubject)
        .get()
        .then(snapshot => {
            const results = [];
            snapshot.forEach(doc => {
                const student = doc.data();
                if (student.name.toLowerCase().includes(query)) {
                    results.push({
                        type: 'student',
                        id: doc.id,
                        name: student.name,
                        details: `${student.teacherName || 'مدرس غير محدد'}`,
                        data: student
                    });
                }
            });
            
            displaySearchResults(results, resultsContainer, 'subject');
        });
}

function displaySearchResults(results, container, searchType) {
    if (results.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:10px;color:#666;">لا توجد نتائج</div>';
        return;
    }
    
    container.innerHTML = '';
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => handleSearchResultClick(result);
        item.innerHTML = `
            <div class="search-result-icon">${result.icon}</div>
            <div class="search-result-info">
                <div class="search-result-name">${result.name}</div>
                <div class="search-result-details">${result.details}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function handleSearchResultClick(result) {
    if (result.type === 'student') {
        // Navigate to student
        db.collection('groups').doc(result.data.groupId).get().then(groupDoc => {
            if (groupDoc.exists) {
                const group = groupDoc.data();
                currentGroup = { id: result.data.groupId, day: group.day, time: group.time };
                currentTeacher = { id: result.data.teacherId, name: result.data.teacherName };
                currentSubject = result.data.subject;
                currentGrade = { id: result.data.gradeId, name: result.data.gradeName };
                selectStudent(result.id);
            }
        });
    } else if (result.type === 'teacher') {
        // Navigate to teacher
        currentGrade = { id: result.data.gradeId, name: result.data.gradeName };
        currentSubject = result.data.subject;
        selectTeacher(result.id, result.data.name);
    } else if (result.type === 'subject') {
        // Navigate to subject
        currentGrade = { id: result.data.gradeId, name: result.data.gradeName };
        currentSubject = result.data.name;
        document.getElementById('subject-title').textContent = result.data.name;
        document.getElementById('subject-grade').textContent = result.data.gradeName;
        loadTeachers();
        showPage('teachers-page');
    }
    
    // Clear search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.value = '';
        document.getElementById('global-search-results').innerHTML = '';
    }
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-toggle-btn');
    
    body.classList.toggle('dark-theme');
    
    // Update button icon
    if (body.classList.contains('dark-theme')) {
        themeBtn.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeBtn.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Load saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('theme-toggle-btn');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeBtn) themeBtn.textContent = '☀️';
    }
});
