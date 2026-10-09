package com.edrevel.learningpath.repository;

import com.edrevel.learningpath.model.LearningPath;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {
}