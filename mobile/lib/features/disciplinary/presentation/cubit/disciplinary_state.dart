import '../../data/models/disciplinary_case_model.dart';

abstract class DisciplinaryState {}

class DisciplinaryInitial extends DisciplinaryState {}

class DisciplinaryLoading extends DisciplinaryState {}

class DisciplinaryCasesLoaded extends DisciplinaryState {
  final List<DisciplinaryCase> cases;
  
  DisciplinaryCasesLoaded(this.cases);
}

class DisciplinaryCaseDetailLoaded extends DisciplinaryState {
  final DisciplinaryCase caseDetails;
  
  DisciplinaryCaseDetailLoaded(this.caseDetails);
}

class DisciplinaryUsersLoaded extends DisciplinaryState {
  final List<dynamic> users;
  DisciplinaryUsersLoaded(this.users);
}

class DisciplinaryActionSuccess extends DisciplinaryState {
  final String message;
  
  DisciplinaryActionSuccess(this.message);
}

class DisciplinaryError extends DisciplinaryState {
  final String message;
  
  DisciplinaryError(this.message);
}
